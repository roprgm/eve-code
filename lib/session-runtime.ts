import {
  Client,
  type ClientSession,
  type HandleMessageStreamEvent,
  isCurrentTurnBoundaryEvent,
  type SendTurnPayload,
  type SessionState,
} from "eve/client";
import { create } from "zustand";

import type { OptimisticMessage, StoredEveEvent } from "@/lib/eve-events";
import { SESSION_ID_HEADER } from "@/lib/identity";

type Connection = {
  readonly controller: AbortController;
  index: number;
  readonly session: ClientSession;
  status: "ready" | "running" | "stopped";
  turnId?: string;
};

export type SessionRuntime = {
  readonly connection: Connection;
  readonly error?: string;
  readonly events: readonly StoredEveEvent[];
  readonly optimistic?: OptimisticMessage;
};

type RuntimeStore = {
  readonly sessions: Readonly<Record<string, SessionRuntime>>;
};

type SendTurnOptions = {
  readonly beforeSend?: Promise<unknown>;
  readonly sessionState?: SessionState;
};

const client = new Client({ host: "" });
const useRuntimes = create<RuntimeStore>()(() => ({ sessions: {} }));

function createConnection(state: SessionState | undefined, streamIndex: number): Connection {
  return {
    controller: new AbortController(),
    index: streamIndex,
    session: client.session({ ...state, streamIndex }),
    status: "running",
  };
}

function resumeConnection(state: SessionState | undefined): Connection | undefined {
  if (!state?.sessionId) return;
  return createConnection(state, state.streamIndex);
}

export function getSessionRuntime(sessionId: string): SessionRuntime | undefined {
  return useRuntimes.getState().sessions[sessionId];
}

function setRuntime(sessionId: string, next: SessionRuntime): void {
  useRuntimes.setState(({ sessions }) => ({ sessions: { ...sessions, [sessionId]: next } }));
}

function updateRuntime(
  sessionId: string,
  connection: Connection,
  update: Partial<SessionRuntime>,
): void {
  useRuntimes.setState((state) => {
    const current = state.sessions[sessionId];
    if (current?.connection !== connection) return state;
    return { sessions: { ...state.sessions, [sessionId]: { ...current, ...update } } };
  });
}

function optimisticMessage(
  input: SendTurnPayload,
  startIndex: number,
): OptimisticMessage | undefined {
  if (typeof input.message !== "string") return;
  return {
    createdAt: Date.now(),
    message: input.message,
    startIndex,
    submissionId: crypto.randomUUID(),
  };
}

function failConnection(sessionId: string, connection: Connection, message: string): void {
  if (connection.status === "stopped" || connection.controller.signal.aborted) return;
  connection.status = "ready";
  updateRuntime(sessionId, connection, { error: message });
}

function appendEvent(
  sessionId: string,
  connection: Connection,
  event: HandleMessageStreamEvent,
): void {
  const current = getSessionRuntime(sessionId);
  if (current?.connection !== connection) return;
  const index = connection.index;
  connection.index += 1;
  if (event.type === "turn.started") connection.turnId = event.data.turnId;
  const update: Partial<SessionRuntime> = {
    events: [...current.events, { event, index }],
  };
  updateRuntime(sessionId, connection, update);
}

async function consumeStream(
  sessionId: string,
  connection: Connection,
  stream: AsyncIterable<HandleMessageStreamEvent>,
): Promise<void> {
  try {
    for await (const event of stream) {
      appendEvent(sessionId, connection, event);
      if (event.type === "session.failed") {
        failConnection(sessionId, connection, "This conversation stopped unexpectedly.");
        return;
      }
      if (isCurrentTurnBoundaryEvent(event)) break;
    }
    if (connection.status === "stopped") return;
    connection.status = "ready";
    updateRuntime(sessionId, connection, {});
  } catch {
    failConnection(sessionId, connection, "Could not stream this conversation.");
  }
}

async function cancelTurn(sessionId: string, connection: Connection): Promise<void> {
  try {
    await connection.session.cancel({ turnId: connection.turnId });
  } catch {
    updateRuntime(sessionId, connection, { error: "Could not stop this conversation." });
  }
}

async function runTurn(
  sessionId: string,
  connection: Connection,
  input: SendTurnPayload,
  beforeSend?: Promise<unknown>,
): Promise<void> {
  if (beforeSend) {
    try {
      await beforeSend;
    } catch {
      clearSessionRuntime(sessionId);
      return;
    }
  }

  try {
    const headers = connection.session.state.sessionId
      ? input.headers
      : { ...input.headers, [SESSION_ID_HEADER]: sessionId };
    const stream = await connection.session.send({
      ...input,
      headers,
      signal: connection.controller.signal,
    });
    if (connection.status === "stopped") {
      await cancelTurn(sessionId, connection);
      connection.controller.abort();
      return;
    }
    await consumeStream(sessionId, connection, stream);
  } catch {
    failConnection(sessionId, connection, "Could not send message.");
  }
}

export function sendTurn(
  sessionId: string,
  input: SendTurnPayload,
  { beforeSend, sessionState }: SendTurnOptions = {},
): void {
  const current = getSessionRuntime(sessionId);
  if (current && current.connection.status !== "ready") return;
  const state = sessionState ?? current?.connection.session.state;
  const startIndex = Math.max(state?.streamIndex ?? 0, current?.connection.index ?? 0);
  const connection = createConnection(state, startIndex);
  setRuntime(sessionId, {
    connection,
    events: current?.events ?? [],
    optimistic: optimisticMessage(input, startIndex),
  });
  void runTurn(sessionId, connection, input, beforeSend);
}

export function followSession(sessionId: string, state: SessionState): void {
  if (!state.sessionId) return;
  if (getSessionRuntime(sessionId)) return;
  const connection = createConnection(state, state.streamIndex);
  setRuntime(sessionId, {
    connection,
    events: [],
  });
  void consumeStream(
    sessionId,
    connection,
    connection.session.stream({ signal: connection.controller.signal }),
  );
}

export async function stopSession(sessionId: string, fallback?: SessionState): Promise<void> {
  const current = getSessionRuntime(sessionId);
  const state = current?.connection.session.state ?? fallback;
  const connection = current?.connection ?? resumeConnection(state);
  if (!connection) return;
  connection.status = "stopped";
  setRuntime(sessionId, {
    ...current,
    connection,
    events: current?.events ?? [],
  });
  connection.controller.abort();
  if (!connection.session.state.sessionId) return;
  await cancelTurn(sessionId, connection);
}

export function clearSessionRuntime(sessionId: string): void {
  getSessionRuntime(sessionId)?.connection?.controller.abort();
  useRuntimes.setState(({ sessions }) => {
    const { [sessionId]: _forgotten, ...remaining } = sessions;
    return { sessions: remaining };
  });
}

export function useSessionRuntime(sessionId: string | undefined): SessionRuntime | undefined {
  return useRuntimes((state) => (sessionId ? state.sessions[sessionId] : undefined));
}
