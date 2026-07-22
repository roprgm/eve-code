import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { isPublicId } from "../lib/identity";
import { internal } from "./_generated/api";
import { internalMutation, mutation, type QueryCtx, query } from "./_generated/server";

const sessionNameLengthMax = 42;
const turnDeleteBatchSize = 100;

function deriveSessionName(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) return "New session";
  if (normalized.length <= sessionNameLengthMax) return normalized;

  const candidate = normalized.slice(0, sessionNameLengthMax - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  if (lastSpace >= 24) return `${candidate.slice(0, lastSpace)}…`;
  return `${candidate}…`;
}

function getSession(ctx: Pick<QueryCtx, "db">, sessionId: string) {
  return ctx.db
    .query("sessions")
    .withIndex("by_session_id", (index) => index.eq("sessionId", sessionId))
    .unique();
}

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("sessions")
      .withIndex("by_updated_at")
      .order("desc")
      .paginate(paginationOpts);
    const page = result.page.map(({ name, sessionId, status }) => ({ name, sessionId, status }));
    return { ...result, page };
  },
});

export const get = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    if (!isPublicId(sessionId)) return null;
    const session = await getSession(ctx, sessionId);
    if (!session) return null;
    const turns = await ctx.db
      .query("turns")
      .withIndex("by_session_and_stream_index", (index) => index.eq("sessionId", sessionId))
      .collect();
    return {
      continuationToken: session.continuationToken,
      events: turns.flatMap(({ events }) => events),
      eveSessionId: session.eveSessionId,
      name: session.name,
      status: session.status,
      streamIndex: session.streamIndex,
    };
  },
});

export const create = mutation({
  args: { message: v.string(), sessionId: v.string() },
  handler: async (ctx, { message, sessionId }) => {
    if (!isPublicId(sessionId)) throw new ConvexError("Invalid session id.");
    const existing = await getSession(ctx, sessionId);
    if (existing) throw new ConvexError("Session already exists.");

    await ctx.db.insert("sessions", {
      name: deriveSessionName(message),
      sessionId,
      status: "ready",
      streamIndex: 0,
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { name: v.string(), sessionId: v.string() },
  handler: async (ctx, { name, sessionId }) => {
    if (!isPublicId(sessionId)) throw new ConvexError("Session not found.");
    const nextName = name.replace(/\s+/g, " ").trim();
    if (!nextName) throw new ConvexError("Session name cannot be empty.");
    if (nextName.length > 100) throw new ConvexError("Session name is too long.");

    const session = await getSession(ctx, sessionId);
    if (!session) throw new ConvexError("Session not found.");
    await ctx.db.patch(session._id, { name: nextName });
  },
});

export const remove = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    if (!isPublicId(sessionId)) throw new ConvexError("Session not found.");
    const session = await getSession(ctx, sessionId);
    if (!session) return;
    const isActive = session.status === "running" || session.status === "stopping";
    if (isActive) {
      throw new ConvexError("Stop this session before deleting it.");
    }

    await ctx.db.delete(session._id);
    await ctx.scheduler.runAfter(0, internal.sessions.removeTurns, { sessionId });
  },
});

export const removeTurns = internalMutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const turns = await ctx.db
      .query("turns")
      .withIndex("by_session_and_stream_index", (index) => index.eq("sessionId", sessionId))
      .take(turnDeleteBatchSize);
    await Promise.all(turns.map((turn) => ctx.db.delete(turn._id)));
    if (turns.length === turnDeleteBatchSize) {
      await ctx.scheduler.runAfter(0, internal.sessions.removeTurns, { sessionId });
    }
  },
});
