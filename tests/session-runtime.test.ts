import type {
  ClientSession,
  HandleMessageStreamEvent,
  SendTurnPayload,
  SessionState,
  StreamOptions,
} from "eve/client";
import { afterEach, expect, it, vi } from "vitest";

type TestStream = AsyncIterable<HandleMessageStreamEvent> & {
  readonly sessionId?: string;
};

type TestSession = Pick<ClientSession, "cancel" | "state"> & {
  send: (input: SendTurnPayload) => Promise<TestStream>;
  stream?: (options?: StreamOptions) => AsyncIterable<HandleMessageStreamEvent>;
};

const mock = vi.hoisted(() => ({
  sessions: [] as TestSession[],
  states: [] as SessionState[],
}));

vi.mock("eve/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/client")>()),
  Client: class {
    session(state: SessionState) {
      mock.states.push(state);
      const session = mock.sessions.shift();
      if (!session) throw new Error("Missing test session.");
      return session;
    }
  },
}));

import {
  isSessionCheckpointed,
  isSessionGenerating,
  type StoredSession,
} from "@/components/session/use-session";
import { createPublicId, SESSION_ID_HEADER } from "@/lib/identity";
import { DEFAULT_MODEL_ID, MODEL_HEADER, MODEL_OPTIONS } from "@/lib/models";
import {
  clearSessionRuntime,
  followSession,
  getSessionRuntime,
  sendTurn,
  stopSession,
} from "@/lib/session-runtime";

const sessionIds = new Set<string>();

function useSessions(...sessions: TestSession[]): void {
  mock.sessions.push(...sessions);
}

function event(type: string, data: Record<string, unknown> = {}): HandleMessageStreamEvent {
  return { data, type } as HandleMessageStreamEvent;
}

function response(
  events: readonly HandleMessageStreamEvent[],
  sessionId = "eve-session-1",
): TestStream {
  const stream = (async function* () {
    yield* events;
  })();
  return Object.assign(stream, { sessionId });
}

function createSession(overrides: Partial<TestSession> = {}): TestSession {
  return {
    cancel: vi.fn(),
    send: vi.fn(async () => response([])),
    state: { sessionId: "eve-session-1", streamIndex: 0 },
    stream: vi.fn(() => response([])),
    ...overrides,
  };
}

function createSessionId(): string {
  const sessionId = createPublicId();
  sessionIds.add(sessionId);
  return sessionId;
}

afterEach(() => {
  for (const sessionId of sessionIds) clearSessionRuntime(sessionId);
  sessionIds.clear();
  mock.sessions.length = 0;
  mock.states.length = 0;
});

it("creates the optimistic runtime before Eve starts", async () => {
  const sessionId = createSessionId();
  let finishCreation: () => void = () => undefined;
  const created = new Promise<void>((resolve) => {
    finishCreation = resolve;
  });
  const send = vi.fn(async () => response([event("session.completed")]));
  useSessions(createSession({ send, state: { streamIndex: 0 } }));

  sendTurn(sessionId, { message: "Start now" }, { beforeSend: created });
  expect(getSessionRuntime(sessionId)?.optimistic?.message).toBe("Start now");
  expect(send).not.toHaveBeenCalled();

  finishCreation();
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
});

it("keeps an input response active until its checkpoint advances", async () => {
  const sessionId = createSessionId();
  let finishPreparation: () => void = () => undefined;
  const prepared = new Promise<void>((resolve) => {
    finishPreparation = resolve;
  });
  const send = vi.fn(async () => response([event("session.waiting")]));
  const saveAnswer = vi.fn(async () => undefined);
  useSessions(
    createSession({
      send,
      state: { sessionId: "eve-session-1", streamIndex: 4 },
    }),
  );

  sendTurn(
    sessionId,
    { inputResponses: [{ optionId: "red", requestId: "color" }] },
    {
      afterSend: saveAnswer,
      beforeSend: prepared,
      sessionState: { sessionId: "eve-session-1", streamIndex: 4 },
    },
  );
  const runtime = getSessionRuntime(sessionId);
  const ready: StoredSession = {
    eveSessionId: "eve-session-1",
    status: "ready",
    streamIndex: 4,
  };

  expect(runtime?.optimistic?.inputResponses).toEqual([{ optionId: "red", requestId: "color" }]);
  expect(isSessionCheckpointed(ready, runtime)).toBe(false);
  expect(isSessionGenerating(ready, runtime)).toBe(true);
  expect(isSessionCheckpointed({ ...ready, streamIndex: 5 }, runtime)).toBe(true);
  expect(send).not.toHaveBeenCalled();
  expect(saveAnswer).not.toHaveBeenCalled();

  finishPreparation();
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  expect(saveAnswer).toHaveBeenCalledOnce();
});

it("shows the optimistic message, then stops locally and cancels Eve", async () => {
  const sessionId = createSessionId();
  const cancelCalls: Array<{ readonly turnId?: string } | undefined> = [];
  const sent: { input?: SendTurnPayload; signal?: AbortSignal } = {};
  const state: { sessionId?: string; streamIndex: number } = { streamIndex: 0 };
  async function* stream() {
    yield event("turn.started", { sequence: 0, turnId: "turn-1" });
    await new Promise<never>((_resolve, reject) => {
      sent.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  }
  useSessions(
    createSession({
      async cancel(options) {
        cancelCalls.push(options);
        return { sessionId: "eve-session-1", status: "accepted" };
      },
      async send(input) {
        sent.input = input;
        sent.signal = input.signal;
        state.sessionId = "eve-session-1";
        return Object.assign(stream(), { sessionId: "eve-session-1" });
      },
      state,
    }),
  );

  sendTurn(sessionId, { message: "Keep working" });
  expect(sent.input?.headers?.[SESSION_ID_HEADER]).toBe(sessionId);
  expect(sent.input?.headers?.[MODEL_HEADER]).toBe(DEFAULT_MODEL_ID);
  await vi.waitFor(() => expect(getSessionRuntime(sessionId)?.connection.turnId).toBe("turn-1"));

  const stopping = stopSession(sessionId);
  expect(getSessionRuntime(sessionId)?.connection.status).toBe("stopped");
  expect(sent.signal?.aborted).toBe(true);
  expect(cancelCalls).toEqual([{ turnId: "turn-1" }]);
  await stopping;
  sendTurn(sessionId, { message: "Too soon" });
  expect(getSessionRuntime(sessionId)?.connection.status).toBe("stopped");
});

it("omits the app session header when Eve already has a session", async () => {
  const sessionId = createSessionId();
  const send = vi.fn(async (_input: SendTurnPayload) => response([event("session.completed")]));
  useSessions(
    createSession({
      send,
      state: { sessionId: "eve-session-1", streamIndex: 1 },
    }),
  );

  const selectedModel = MODEL_OPTIONS[1].value;
  sendTurn(sessionId, { message: "Continue" }, { modelId: selectedModel });
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  expect(send.mock.calls[0]?.[0].headers?.[SESSION_ID_HEADER]).toBeUndefined();
  expect(send.mock.calls[0]?.[0].headers?.[MODEL_HEADER]).toBe(selectedModel);
});

it("keeps a failed cancellation recoverable", async () => {
  const sessionId = createSessionId();
  const session = createSession({
    cancel: vi.fn().mockRejectedValue(new Error("Cancel failed")),
  });
  useSessions(session);

  await stopSession(sessionId, session.state);

  expect(getSessionRuntime(sessionId)?.connection.status).toBe("stopped");
  expect(getSessionRuntime(sessionId)?.error).toBe("Could not stop this conversation.");
});

it("settles a terminal Eve failure and keeps its error", async () => {
  const sessionId = createSessionId();
  useSessions(
    createSession({
      async send() {
        return response([
          event("session.failed", {
            code: "FatalError",
            message: "Server Error",
            sessionId: "eve-session-1",
          }),
        ]);
      },
    }),
  );

  sendTurn(sessionId, { message: "Fail visibly" });
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("settled");
    expect(getSessionRuntime(sessionId)?.error).toBe("This conversation stopped unexpectedly.");
  });
});

it("treats stream EOF without a turn boundary as a recoverable disconnect", async () => {
  const sessionId = createSessionId();
  useSessions(
    createSession({
      async send() {
        return response([
          event("turn.started", { turnId: "turn-1" }),
          event("message.appended", { messageDelta: "Partial" }),
        ]);
      },
    }),
  );

  sendTurn(sessionId, { message: "Keep working" });

  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("disconnected");
  });
  expect(getSessionRuntime(sessionId)?.connection.index).toBe(2);
});

it("resumes a disconnected stream from the furthest known cursor", async () => {
  const sessionId = createSessionId();
  const stream = vi.fn((_options?: StreamOptions) => response([event("session.waiting")]));
  useSessions(
    createSession({
      async send() {
        return response([
          event("turn.started", { turnId: "turn-1" }),
          event("message.appended", { messageDelta: "Partial" }),
        ]);
      },
    }),
    createSession({
      state: { sessionId: "eve-session-1", streamIndex: 1 },
      stream,
    }),
  );

  sendTurn(sessionId, { message: "Keep working" });
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("disconnected");
  });

  followSession(sessionId, { sessionId: "eve-session-1", streamIndex: 1 });

  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("settled");
  });
  expect(mock.states.at(-1)?.streamIndex).toBe(2);
  expect(stream.mock.calls[0]?.[0]?.startIndex).toBe(2);
  expect(getSessionRuntime(sessionId)?.events.map(({ index }) => index)).toEqual([0, 1, 2]);
});

it("does not reconnect repeatedly without an external wake-up", async () => {
  const sessionId = createSessionId();
  const stream = vi.fn(() => response([]));
  useSessions(createSession({ stream }));

  followSession(sessionId, { sessionId: "eve-session-1", streamIndex: 0 });

  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("disconnected");
  });
  expect(stream).toHaveBeenCalledOnce();
  expect(mock.states).toHaveLength(1);
});

it("ignores events from a replaced connection", async () => {
  const sessionId = createSessionId();
  let releaseOldStream: () => void = () => undefined;
  const oldStream = (async function* () {
    await new Promise<void>((resolve) => {
      releaseOldStream = resolve;
    });
    yield event("message.appended", { messageDelta: "stale" });
  })();
  const newStream = vi.fn(() => response([event("session.waiting")]));
  useSessions(
    createSession({
      async send() {
        return Object.assign(oldStream, { sessionId: "eve-session-1" });
      },
    }),
    createSession({ stream: newStream }),
  );

  sendTurn(sessionId, { message: "Keep working" });
  await vi.waitFor(() => expect(getSessionRuntime(sessionId)).toBeDefined());
  const runtime = getSessionRuntime(sessionId);
  if (!runtime) throw new Error("Missing session runtime.");
  runtime.connection.status = "disconnected";
  followSession(sessionId, { sessionId: "eve-session-1", streamIndex: 0 });
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("settled");
  });

  releaseOldStream();
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.events).toHaveLength(1);
  });
  expect(getSessionRuntime(sessionId)?.events[0]?.event.type).toBe("session.waiting");
});

it("can stop after the original client session loses its local state", async () => {
  const sessionId = createSessionId();
  const cancel = vi.fn(async () => ({
    sessionId: "eve-session-1",
    status: "accepted" as const,
  }));
  useSessions(
    createSession({
      async send() {
        return response([event("turn.started", { turnId: "turn-1" })]);
      },
      state: { streamIndex: 0 },
    }),
    createSession({ cancel }),
  );

  sendTurn(sessionId, { message: "Keep working" });
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("disconnected");
  });
  await stopSession(sessionId);

  expect(mock.states.at(-1)).toEqual({
    sessionId: "eve-session-1",
    streamIndex: 1,
  });
  expect(cancel).toHaveBeenCalledWith({ turnId: "turn-1" });
});

it("lets a durable checkpoint replace disconnected local transport state", async () => {
  const sessionId = createSessionId();
  useSessions(
    createSession({
      async send() {
        return response([event("turn.started", { turnId: "turn-1" })]);
      },
    }),
  );
  sendTurn(sessionId, { message: "Keep working" });
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("disconnected");
  });
  const runtime = getSessionRuntime(sessionId);
  const running: StoredSession = {
    eveSessionId: "eve-session-1",
    status: "running",
    streamIndex: 1,
  };
  const ready: StoredSession = { ...running, status: "ready" };

  expect(isSessionCheckpointed(running, runtime)).toBe(false);
  expect(isSessionGenerating(running, runtime)).toBe(true);
  expect(isSessionCheckpointed(ready, runtime)).toBe(true);
  expect(isSessionGenerating(ready, runtime)).toBe(false);
});
