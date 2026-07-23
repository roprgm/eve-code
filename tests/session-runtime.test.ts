import type { ClientSession, HandleMessageStreamEvent, SendTurnPayload } from "eve/client";
import { expect, it, vi } from "vitest";

type TestSession = Pick<ClientSession, "cancel" | "state"> & {
  send: (input: SendTurnPayload) => Promise<AsyncIterable<HandleMessageStreamEvent>>;
};

const mock = vi.hoisted(() => ({ session: undefined as TestSession | undefined }));

vi.mock("eve/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/client")>()),
  Client: class {
    session() {
      if (!mock.session) throw new Error("Missing test session.");
      return mock.session;
    }
  },
}));

import { createPublicId, SESSION_ID_HEADER } from "@/lib/identity";
import {
  clearSessionRuntime,
  getSessionRuntime,
  sendTurn,
  stopSession,
} from "@/lib/session-runtime";

it("creates the optimistic runtime before Eve starts", async () => {
  const sessionId = createPublicId();
  let finishCreation: () => void = () => undefined;
  const created = new Promise<void>((resolve) => {
    finishCreation = resolve;
  });
  const send = vi.fn(async () =>
    (async function* () {
      yield { type: "session.completed" } as HandleMessageStreamEvent;
    })(),
  );
  mock.session = {
    cancel: vi.fn(),
    send,
    state: { streamIndex: 0 },
  };

  sendTurn(sessionId, { message: "Start now" }, { beforeSend: created });
  expect(getSessionRuntime(sessionId)?.optimistic?.message).toBe("Start now");
  expect(send).not.toHaveBeenCalled();

  finishCreation();
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  clearSessionRuntime(sessionId);
});

it("shows the optimistic message, then stops locally and cancels Eve", async () => {
  const sessionId = createPublicId();
  const cancelCalls: Array<{ readonly turnId?: string } | undefined> = [];
  const sent: { input?: SendTurnPayload; signal?: AbortSignal } = {};
  const state: { sessionId?: string; streamIndex: number } = { streamIndex: 0 };
  async function* stream() {
    yield {
      data: { sequence: 0, turnId: "turn-1" },
      type: "turn.started",
    } as HandleMessageStreamEvent;
    await new Promise<never>((_resolve, reject) => {
      sent.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  }
  mock.session = {
    async cancel(options) {
      cancelCalls.push(options);
      return { sessionId: "session-1", status: "accepted" };
    },
    async send(input) {
      sent.input = input;
      sent.signal = input.signal;
      state.sessionId = "session-1";
      return stream();
    },
    state,
  };

  sendTurn(sessionId, { message: "Keep working" });
  expect(sent.input?.headers?.[SESSION_ID_HEADER]).toBe(sessionId);
  await vi.waitFor(() => expect(getSessionRuntime(sessionId)?.connection.turnId).toBe("turn-1"));

  const stopping = stopSession(sessionId);
  expect(getSessionRuntime(sessionId)?.connection.status).toBe("stopped");
  expect(sent.signal?.aborted).toBe(true);
  expect(cancelCalls).toEqual([{ turnId: "turn-1" }]);
  await stopping;
  sendTurn(sessionId, { message: "Too soon" });
  expect(getSessionRuntime(sessionId)?.connection.status).toBe("stopped");
  clearSessionRuntime(sessionId);
});

it("omits the app session header when Eve already has a session", async () => {
  const sessionId = createPublicId();
  const send = vi.fn(async (_input: SendTurnPayload) =>
    (async function* () {
      yield { type: "session.completed" } as HandleMessageStreamEvent;
    })(),
  );
  mock.session = {
    cancel: vi.fn(),
    send,
    state: { sessionId: "session-1", streamIndex: 1 },
  };

  sendTurn(sessionId, { message: "Continue" });
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  expect(send.mock.calls[0]?.[0].headers?.[SESSION_ID_HEADER]).toBeUndefined();
  clearSessionRuntime(sessionId);
});

it("keeps a failed cancellation recoverable", async () => {
  const sessionId = createPublicId();
  mock.session = {
    cancel: vi.fn().mockRejectedValue(new Error("Cancel failed")),
    send: vi.fn(),
    state: { sessionId: "session-1", streamIndex: 0 },
  };

  await stopSession(sessionId, mock.session.state);

  expect(getSessionRuntime(sessionId)?.connection.status).toBe("stopped");
  expect(getSessionRuntime(sessionId)?.error).toBe("Could not stop this conversation.");
  clearSessionRuntime(sessionId);
});

it("surfaces a terminal Eve failure", async () => {
  const sessionId = createPublicId();
  mock.session = {
    cancel: vi.fn(),
    async send() {
      return (async function* () {
        yield {
          data: { code: "FatalError", message: "Server Error", sessionId: "session-1" },
          type: "session.failed",
        } as HandleMessageStreamEvent;
      })();
    },
    state: { sessionId: "session-1", streamIndex: 0 },
  };

  sendTurn(sessionId, { message: "Fail visibly" });
  await vi.waitFor(() => {
    expect(getSessionRuntime(sessionId)?.connection.status).toBe("ready");
    expect(getSessionRuntime(sessionId)?.error).toBe("This conversation stopped unexpectedly.");
  });
  clearSessionRuntime(sessionId);
});
