import type { HandleMessageStreamEvent } from "eve/client";
import { describe, expect, it } from "vitest";

import { compactTurn } from "@/lib/eve-checkpoint";

function event(type: string, data: object = {}): HandleMessageStreamEvent {
  return { data, type } as HandleMessageStreamEvent;
}

const start = event("turn.started", { sequence: 0, turnId: "turn-1" });
const received = event("message.received", { message: "Hello", turnId: "turn-1" });
const waiting = event("session.waiting");
const delta = (messageSoFar: string) =>
  event("message.appended", { messageSoFar, stepIndex: 0, turnId: "turn-1" });

describe("compactTurn checkpoint", () => {
  it("replaces deltas with settled content without changing the cursor", () => {
    const checkpoint = compactTurn(
      [
        start,
        received,
        delta("First"),
        delta("First draft"),
        event("message.completed", {
          message: "Final answer",
          stepIndex: 0,
          turnId: "turn-1",
        }),
        event("turn.completed", { turnId: "turn-1" }),
        waiting,
      ],
      0,
    );
    expect(checkpoint.streamIndex).toBe(7);
    const types = checkpoint.events.map(({ event }) => event.type);
    expect(types).not.toContain("message.appended");
    expect(types).toContain("message.completed");
    expect(checkpoint.events.map(({ index }) => index)).toEqual([0, 1, 4, 5, 6]);
    expect(checkpoint.searchText).toBe("Hello\nFinal answer");
    expect(checkpoint.status).toBe("ready");
  });

  it("checkpoints cancellation with the last cumulative partial", () => {
    const checkpoint = compactTurn(
      [
        start,
        delta("Partial"),
        delta("Partial answer"),
        event("turn.cancelled", { turnId: "turn-1" }),
        waiting,
      ],
      12,
    );
    expect(checkpoint.streamIndex).toBe(17);
    const types = checkpoint.events.map(({ event }) => event.type);
    expect(types).toContain("turn.cancelled");
    expect(checkpoint.events.at(1)?.index).toBe(14);
    expect(checkpoint.searchText).toBe("Partial answer");
    expect(checkpoint.status).toBe("ready");
  });

  it("keeps a recoverable turn failure visible", () => {
    const checkpoint = compactTurn(
      [start, received, event("turn.failed", { turnId: "turn-1" }), waiting],
      4,
    );
    expect(checkpoint.status).toBe("error");
    expect(checkpoint.streamIndex).toBe(8);
  });

  it("sums token usage across completed steps", () => {
    const checkpoint = compactTurn(
      [
        start,
        received,
        event("step.completed", {
          finishReason: "stop",
          stepIndex: 0,
          turnId: "turn-1",
          usage: { inputTokens: 100, outputTokens: 20 },
        }),
        event("step.completed", {
          finishReason: "stop",
          stepIndex: 1,
          turnId: "turn-1",
          usage: { inputTokens: 130, outputTokens: 15 },
        }),
        event("turn.completed", { turnId: "turn-1" }),
        waiting,
      ],
      0,
    );
    expect(checkpoint.usage).toEqual({ inputTokens: 230, outputTokens: 35 });
  });

  it("preserves stored edit diffs", () => {
    const action = event("action.result", {
      result: {
        callId: "call-1",
        kind: "tool-result",
        output: {
          diff: "@@ -1 +1 @@\n-red\n+blue",
        },
        toolName: "edit_file",
      },
      stepIndex: 0,
      turnId: "turn-1",
    });
    const checkpoint = compactTurn(
      [start, action, event("turn.completed", { turnId: "turn-1" }), waiting],
      0,
    );
    expect(checkpoint.events).toContainEqual({ event: action, index: 1 });
  });
});
