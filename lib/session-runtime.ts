import {
  Client,
  type ClientSession,
  type HandleMessageStreamEvent,
  isCurrentTurnBoundaryEvent,
  type SendTurnPayload,
  type SessionState,
} from "eve/client";
import { create } from "zustand";

import type { OptimisticTurn, StoredEveEvent } from "@/lib/eve-events";
import { SESSION_ID_HEADER } from "@/lib/identity";

type Connection = {
  readonly controller: AbortController;
  index: number;
  readonly session: ClientSession;
  sessionId?: string;
  status: "disconnected" | "failed" | "running" | "settled" | "stopped";
  readonly submittedAtIndex?: number;
  turnId?: string;
};

export type SessionRuntime = {
  readonly connection: Connection;
  readonly error?: string;
  readonly events: readonly StoredEveEvent[];
  readonly optimistic?: OptimisticTurn;
};

type RuntimeStore = {
  readonly sessions: Readonly<Record<string, SessionRuntime>>;
};

type SendTurnOptions = {
  readonly afterSend?: () => Promise<unknown>;
  readonly beforeSend?: Promise<unknown>;
  readonly sessionState?: SessionState;
};

const client = new Client({ host: "" });
const useRuntimes = create<RuntimeStore>()(() => ({ sessions: {} }));

function createConnection(
  state: SessionState | undefined,
  streamIndex: number,
  submittedAtIndex?: number,
): Connection {
  return {
    controller: new AbortController(),
    index: streamIndex,
    session: client.session({ ...state, streamIndex }),
    sessionId: state?.sessionId,
    status: "running",
    submittedAtIndex,
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

function optimisticTurn(input: SendTurnPayload, startIndex: number): OptimisticTurn | undefined {
  const message = typeof input.message === "string" ? input.message : undefined;
  const inputResponses = input.inputResponses?.length ? input.inputResponses : undefined;
  if (message === undefined && inputResponses === undefined) return;
  return {
    createdAt: Date.now(),
    inputResponses,
    message,
    startIndex,
    submissionId: crypto.randomUUID(),
  };
}

function failConnection(sessionId: string, connection: Connection, message: string): void {
  if (connection.status === "stopped" || connection.controller.signal.aborted) return;
  connection.status = "failed";
  updateRuntime(sessionId, connection, { error: message });
}

function disconnectConnection(sessionId: string, connection: Connection): void {
  if (!connection.sessionId) {
    failConnection(sessionId, connection, "Could not stream this conversation.");
    return;
  }
  if (connection.status === "stopped" || connection.controller.signal.aborted) return;
  connection.status = "disconnected";
  updateRuntime(sessionId, connection, {});
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
        updateRuntime(sessionId, connection, {
          error: "This conversation stopped unexpectedly.",
        });
      }
      if (!isCurrentTurnBoundaryEvent(event)) continue;
      if (connection.status === "stopped") return;
      connection.status = "settled";
      updateRuntime(sessionId, connection, {});
      return;
    }
    disconnectConnection(sessionId, connection);
  } catch {
    disconnectConnection(sessionId, connection);
  }
}

function getCancellationSession(connection: Connection): ClientSession | undefined {
  if (connection.session.state.sessionId) return connection.session;
  if (!connection.sessionId) return;
  return client.session({ sessionId: connection.sessionId, streamIndex: connection.index });
}

async function cancelTurn(sessionId: string, connection: Connection): Promise<void> {
  const session = getCancellationSession(connection);
  if (!session) return;
  try {
    await session.cancel({ turnId: connection.turnId });
  } catch {
    updateRuntime(sessionId, connection, { error: "Could not stop this conversation." });
  }
}

async function runTurn(
  sessionId: string,
  connection: Connection,
  input: SendTurnPayload,
  afterSend?: () => Promise<unknown>,
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
    connection.sessionId = stream.sessionId;
    if (afterSend) {
      try {
        await afterSend();
      } catch {
        updateRuntime(sessionId, connection, { error: "Could not save this answer." });
      }
    }
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
  { afterSend, beforeSend, sessionState }: SendTurnOptions = {},
): void {
  const current = getSessionRuntime(sessionId);
  if (current && current.connection.status !== "failed") return;
  const state = sessionState ?? current?.connection.session.state;
  const startIndex = Math.max(state?.streamIndex ?? 0, current?.connection.index ?? 0);
  const connection = createConnection(state, startIndex, startIndex);
  setRuntime(sessionId, {
    connection,
    events: current?.events ?? [],
    optimistic: optimisticTurn(input, startIndex),
  });
  void runTurn(sessionId, connection, input, afterSend, beforeSend);
}

export function followSession(sessionId: string, state: SessionState): void {
  if (!state.sessionId) return;
  const current = getSessionRuntime(sessionId);
  if (
    current &&
    current.connection.status !== "disconnected" &&
    current.connection.status !== "failed"
  ) {
    return;
  }
  const startIndex = Math.max(state.streamIndex, current?.connection.index ?? 0);
  const connection = createConnection(state, startIndex);
  current?.connection.controller.abort();
  setRuntime(sessionId, {
    connection,
    events: current?.events ?? [],
    optimistic: current?.optimistic,
  });
  void consumeStream(
    sessionId,
    connection,
    connection.session.stream({ signal: connection.controller.signal, startIndex }),
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
