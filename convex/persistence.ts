import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation, type QueryCtx, query } from "./_generated/server";

const identity = { eveSessionId: v.string(), sessionId: v.string() };
const event = v.object({ event: v.any(), index: v.number() });
const inputResponse = v.object({
  optionId: v.optional(v.string()),
  requestId: v.string(),
  text: v.optional(v.string()),
});
const stopRecoveryDelayMs = 20_000;

async function getSession(ctx: Pick<QueryCtx, "db">, sessionId: string, eveSessionId?: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_session_id", (index) => index.eq("sessionId", sessionId))
    .unique();
  if (eveSessionId && session?.eveSessionId && session.eveSessionId !== eveSessionId) {
    throw new ConvexError("Session id conflict.");
  }
  return session;
}

function getTurn(ctx: Pick<QueryCtx, "db">, sessionId: string, turnId: string) {
  return ctx.db
    .query("turns")
    .withIndex("by_session_and_turn", (index) =>
      index.eq("sessionId", sessionId).eq("turnId", turnId),
    )
    .unique();
}

export const replayState = query({
  args: { ...identity, turnId: v.string() },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId, args.eveSessionId);
    if (!session) return { committed: false, deleted: true, streamIndex: 0 };
    const turn = await getTurn(ctx, args.sessionId, args.turnId);
    return { committed: Boolean(turn), deleted: false, streamIndex: session.streamIndex };
  },
});

export const beginTurn = mutation({
  args: { ...identity, startedAt: v.number() },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId, args.eveSessionId);
    if (!session) return;
    await ctx.db.patch(session._id, {
      eveSessionId: args.eveSessionId,
      status: session.status === "ready" ? "running" : session.status,
      updatedAt: Math.max(session.updatedAt, args.startedAt),
    });
  },
});

export const prepareTurn = mutation({
  args: { sessionId: v.string(), streamIndex: v.number() },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    if (!session || session.streamIndex !== args.streamIndex) {
      throw new ConvexError("Session changed before the turn started.");
    }
    if (session.status === "stopping") throw new ConvexError("Session is stopping.");
    if (session.status === "error") await ctx.db.patch(session._id, { status: "ready" });
  },
});

export const recordInputResponses = mutation({
  args: {
    inputResponses: v.array(inputResponse),
    sessionId: v.string(),
    streamIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    if (!session || session.streamIndex !== args.streamIndex) {
      throw new ConvexError("Session changed before the answer was saved.");
    }
    const turn = await ctx.db
      .query("turns")
      .withIndex("by_session_and_stream_index", (index) => index.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    if (!turn) throw new ConvexError("Input request was not found.");
    await ctx.db.patch(turn._id, {
      events: [
        ...turn.events,
        {
          event: {
            data: { createdAt: Date.now(), responses: args.inputResponses },
            type: "client.input.responded",
          },
          index: Math.max(0, session.streamIndex - 1),
        },
      ],
    });
  },
});

export const requestTurnStop = mutation({
  args: { sessionId: v.string(), streamIndex: v.number() },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    if (!session || session.streamIndex !== args.streamIndex) return false;
    if (session.status === "stopping") return true;
    await ctx.db.patch(session._id, { status: "stopping" });
    await ctx.scheduler.runAfter(
      stopRecoveryDelayMs,
      internal.persistence.releaseStoppedTurn,
      args,
    );
    return true;
  },
});

export const releaseStoppedTurn = internalMutation({
  args: { sessionId: v.string(), streamIndex: v.number() },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    if (session?.status !== "stopping" || session.streamIndex !== args.streamIndex) return;
    await ctx.db.patch(session._id, { status: "error" });
  },
});

export const commitTurn = mutation({
  args: {
    ...identity,
    completedAt: v.number(),
    continuationToken: v.optional(v.string()),
    events: v.array(event),
    searchText: v.string(),
    status: v.union(v.literal("ready"), v.literal("error")),
    streamIndex: v.number(),
    turnId: v.string(),
    usage: v.object({ inputTokens: v.number(), outputTokens: v.number() }),
  },
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId, args.eveSessionId);
    if (!session) return;
    const existing = await getTurn(ctx, args.sessionId, args.turnId);
    if (existing) return;

    if (args.streamIndex <= session.streamIndex) {
      throw new ConvexError("Stream cursor did not advance.");
    }
    await ctx.db.insert("turns", {
      events: args.events,
      searchText: args.searchText,
      sessionId: args.sessionId,
      streamIndex: args.streamIndex,
      turnId: args.turnId,
      usage: args.usage,
    });
    await ctx.db.patch(session._id, {
      continuationToken: args.continuationToken,
      status: args.status,
      streamIndex: args.streamIndex,
      updatedAt: Math.max(session.updatedAt, args.completedAt),
    });
  },
});
