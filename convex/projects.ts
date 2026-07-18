import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { isPublicId } from "../lib/identity";
import { internal } from "./_generated/api";
import { internalMutation, mutation, type QueryCtx, query } from "./_generated/server";

const DELETE_BATCH_SIZE = 100;
const MAX_NAME_LENGTH = 42;

function deriveProjectName(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) return "New project";
  if (normalized.length <= MAX_NAME_LENGTH) return normalized;

  const candidate = normalized.slice(0, MAX_NAME_LENGTH - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  if (lastSpace >= 24) return `${candidate.slice(0, lastSpace)}…`;
  return `${candidate}…`;
}

function getProject(ctx: Pick<QueryCtx, "db">, projectId: string) {
  return ctx.db
    .query("projects")
    .withIndex("by_project_id", (index) => index.eq("projectId", projectId))
    .unique();
}

function getProjectSession(ctx: Pick<QueryCtx, "db">, projectId: string) {
  return ctx.db
    .query("sessions")
    .withIndex("by_project_id", (index) => index.eq("projectId", projectId))
    .unique();
}

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("projects")
      .withIndex("by_updated_at")
      .order("desc")
      .paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async ({ name, projectId }) => {
        const session = await getProjectSession(ctx, projectId);
        return {
          name,
          projectId,
          sessionId: session?.sessionId ?? "",
          status: session?.status ?? "ready",
        };
      }),
    );
    return { ...result, page };
  },
});

export const get = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    if (!isPublicId(projectId)) return null;
    const project = await getProject(ctx, projectId);
    if (!project) return null;
    const session = await getProjectSession(ctx, projectId);
    if (!session) return null;
    const turns = await ctx.db
      .query("turns")
      .withIndex("by_session_and_stream_index", (index) => index.eq("sessionId", session.sessionId))
      .collect();
    return {
      events: turns.flatMap(({ events }) => events),
      name: project.name,
      session: {
        continuationToken: session.continuationToken,
        eveSessionId: session.eveSessionId,
        sessionId: session.sessionId,
        status: session.status,
        streamIndex: session.streamIndex,
      },
    };
  },
});

export const create = mutation({
  args: { message: v.string(), projectId: v.string(), sessionId: v.string() },
  handler: async (ctx, { message, projectId, sessionId }) => {
    if (!isPublicId(projectId) || !isPublicId(sessionId)) {
      throw new ConvexError("Invalid project id.");
    }
    const existing = await getProject(ctx, projectId);
    if (existing) throw new ConvexError("Project already exists.");

    await ctx.db.insert("projects", {
      name: deriveProjectName(message),
      projectId,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("sessions", {
      projectId,
      sessionId,
      status: "ready",
      streamIndex: 0,
    });
  },
});

export const rename = mutation({
  args: { name: v.string(), projectId: v.string() },
  handler: async (ctx, { name, projectId }) => {
    if (!isPublicId(projectId)) throw new ConvexError("Project not found.");
    const nextName = name.replace(/\s+/g, " ").trim();
    if (!nextName) throw new ConvexError("Project name cannot be empty.");
    if (nextName.length > 100) throw new ConvexError("Project name is too long.");

    const project = await getProject(ctx, projectId);
    if (!project) throw new ConvexError("Project not found.");
    await ctx.db.patch(project._id, { name: nextName });
  },
});

export const remove = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    if (!isPublicId(projectId)) throw new ConvexError("Project not found.");
    const project = await getProject(ctx, projectId);
    if (!project) return;
    const session = await getProjectSession(ctx, projectId);
    if (session?.status === "running") {
      throw new ConvexError("Stop this project before deleting it.");
    }

    await ctx.db.delete(project._id);
    if (!session) return;
    await ctx.db.delete(session._id);
    await ctx.scheduler.runAfter(0, internal.projects.removeTurns, {
      sessionId: session.sessionId,
    });
  },
});

export const removeTurns = internalMutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const turns = await ctx.db
      .query("turns")
      .withIndex("by_session_and_stream_index", (index) => index.eq("sessionId", sessionId))
      .take(DELETE_BATCH_SIZE);
    await Promise.all(turns.map((turn) => ctx.db.delete(turn._id)));
    if (turns.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.projects.removeTurns, { sessionId });
    }
  },
});
