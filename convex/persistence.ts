import { ConvexError, v } from "convex/values";

import { isPublicId } from "../lib/identity";
import { env, type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";

const identity = { eveSessionId: v.string(), secret: v.string(), sessionId: v.string() };
const event = v.object({ event: v.any(), index: v.number() });

function authorize(sessionId: string, secret: string): void {
  if (secret === env.EVE_HOOK_SECRET && isPublicId(sessionId)) return;
  throw new ConvexError("Invalid Eve persistence request.");
}

async function getSession(ctx: Pick<QueryCtx, "db">, sessionId: string, eveSessionId: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_session_id", (index) => index.eq("sessionId", sessionId))
    .unique();
  if (session?.eveSessionId && session.eveSessionId !== eveSessionId) {
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

async function touchProject(ctx: MutationCtx, projectId: string, at: number): Promise<void> {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_project_id", (index) => index.eq("projectId", projectId))
    .unique();
  if (!project) return;
  await ctx.db.patch(project._id, { updatedAt: Math.max(project.updatedAt, at) });
}

export const replayState = query({
  args: { ...identity, turnId: v.string() },
  handler: async (ctx, args) => {
    authorize(args.sessionId, args.secret);
    const session = await getSession(ctx, args.sessionId, args.eveSessionId);
    if (!session) return { committed: false, deleted: true, streamIndex: 0 };
    const turn = await getTurn(ctx, args.sessionId, args.turnId);
    return { committed: Boolean(turn), deleted: false, streamIndex: session.streamIndex };
  },
});

export const beginTurn = mutation({
  args: { ...identity, startedAt: v.number() },
  handler: async (ctx, args) => {
    authorize(args.sessionId, args.secret);
    const session = await getSession(ctx, args.sessionId, args.eveSessionId);
    if (!session) return;
    await ctx.db.patch(session._id, {
      eveSessionId: args.eveSessionId,
      status: "running",
    });
    await touchProject(ctx, session.projectId, args.startedAt);
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
    authorize(args.sessionId, args.secret);
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
    });
    await touchProject(ctx, session.projectId, args.completedAt);
  },
});
