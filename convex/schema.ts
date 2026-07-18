import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const storedEvent = v.object({ event: v.any(), index: v.number() });

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    projectId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_updated_at", ["updatedAt"]),

  sessions: defineTable({
    continuationToken: v.optional(v.string()),
    eveSessionId: v.optional(v.string()),
    projectId: v.string(),
    sessionId: v.string(),
    status: v.union(v.literal("ready"), v.literal("running"), v.literal("error")),
    streamIndex: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_session_id", ["sessionId"]),

  turns: defineTable({
    events: v.array(storedEvent),
    searchText: v.string(),
    sessionId: v.string(),
    streamIndex: v.number(),
    turnId: v.string(),
    usage: v.object({ inputTokens: v.number(), outputTokens: v.number() }),
  })
    .index("by_session_and_stream_index", ["sessionId", "streamIndex"])
    .index("by_session_and_turn", ["sessionId", "turnId"])
    .searchIndex("search_text", { searchField: "searchText", filterFields: ["sessionId"] }),
});
