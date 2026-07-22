import { getVercelOidcToken } from "@vercel/oidc";
import { ConvexHttpClient } from "convex/browser";
import { Client, type HandleMessageStreamEvent } from "eve/client";
import { defineHook, type HookContext } from "eve/hooks";

import { api } from "@/convex/_generated/api";
import { compactTurn } from "@/lib/eve-checkpoint";
import { isPublicId, SESSION_ID_ATTRIBUTE } from "@/lib/identity";
import { getStringProperty } from "@/lib/object";

type BoundaryEvent = Extract<
  HandleMessageStreamEvent,
  { type: "session.completed" | "session.failed" | "session.waiting" }
>;

function getPersistenceClient(): ConvexHttpClient {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) throw new Error("Convex persistence is not configured.");
  return new ConvexHttpClient(convexUrl);
}

function replayClient(): Client {
  const deploymentUrl = process.env.VERCEL_URL;
  if (!deploymentUrl) return new Client({ host: "http://127.0.0.1:4879" });
  return new Client({
    auth: { vercelOidc: { token: getVercelOidcToken } },
    host: `https://${deploymentUrl}`,
    redirect: "error",
  });
}

async function beginTurn(
  _event: Extract<HandleMessageStreamEvent, { type: "turn.started" }>,
  ctx: HookContext,
): Promise<void> {
  if (ctx.session.parent) return;
  const sessionId = getStringProperty(ctx.session.auth.initiator?.attributes, SESSION_ID_ATTRIBUTE);
  if (!isPublicId(sessionId)) return;

  const client = getPersistenceClient();
  await client.mutation(api.persistence.beginTurn, {
    eveSessionId: ctx.session.id,
    sessionId,
    startedAt: Date.now(),
  });
}

async function commitTurn(event: BoundaryEvent, ctx: HookContext): Promise<void> {
  if (ctx.session.parent) return;
  const sessionId = getStringProperty(ctx.session.auth.initiator?.attributes, SESSION_ID_ATTRIBUTE);
  if (!isPublicId(sessionId)) return;

  const client = getPersistenceClient();
  const turnId = ctx.session.turn.id;
  const replayState = await client.query(api.persistence.replayState, {
    eveSessionId: ctx.session.id,
    sessionId,
    turnId,
  });
  if (replayState.deleted) return;
  if (replayState.committed) return;

  const session = replayClient().session({
    sessionId: ctx.session.id,
    streamIndex: replayState.streamIndex,
  });
  const replay: HandleMessageStreamEvent[] = [];
  for await (const item of session.stream({ startIndex: replayState.streamIndex })) {
    replay.push(item);
    if (item.type === event.type) break;
  }
  const checkpoint = compactTurn(replay, replayState.streamIndex);
  if (checkpoint.turnId !== turnId) throw new Error("Eve replay returned a different turn.");
  let continuationToken: string | undefined;
  if (event.type === "session.waiting") continuationToken = event.data.continuationToken;

  await client.mutation(api.persistence.commitTurn, {
    completedAt: Date.now(),
    continuationToken,
    events: checkpoint.events,
    eveSessionId: ctx.session.id,
    searchText: checkpoint.searchText.slice(0, 100_000),
    sessionId,
    status: checkpoint.status,
    streamIndex: checkpoint.streamIndex,
    turnId,
    usage: checkpoint.usage,
  });
}

export default defineHook({
  events: {
    "session.completed": commitTurn,
    "session.failed": commitTurn,
    "session.waiting": commitTurn,
    "turn.started": beginTurn,
  },
});
