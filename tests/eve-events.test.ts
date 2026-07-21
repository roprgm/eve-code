import type { HandleMessageStreamEvent } from "eve/client";
import { describe, expect, it } from "vitest";

import {
  getReasoningTimingKey,
  getToolTimingKey,
  projectActivityTimings,
  projectEveMessages,
  type StoredEveEvent,
} from "@/lib/eve-events";

function userEvent(index: number, message: string, at: string): StoredEveEvent {
  return {
    event: {
      data: { message, sequence: index, turnId: `turn_${index}` },
      meta: { at },
      type: "message.received",
    },
    index,
  };
}

const optimistic = {
  createdAt: 20,
  message: "second",
  startIndex: 1,
  submissionId: "submission-1",
};

describe("projectEveMessages", () => {
  it("inserts an optimistic message after its checkpoint", () => {
    const messages = projectEveMessages(
      [userEvent(0, "first", "2026-01-01T10:00:00.000Z")],
      optimistic,
    );
    expect(messages.map(({ id }) => id)).toEqual(["turn_0:user", "optimistic:submission-1:user"]);
    expect(messages.at(-1)?.createdAt).toBe(20);
  });

  it("reconciles message.received without duplication", () => {
    const messages = projectEveMessages(
      [
        userEvent(0, "first", "2026-01-01T10:00:00.000Z"),
        userEvent(1, "second", "2026-01-01T10:01:00.000Z"),
      ],
      optimistic,
    );
    expect(messages.map(({ id }) => id)).toEqual(["turn_0:user", "turn_1:user"]);
    expect(messages.at(-1)?.createdAt).toBe(20);
  });
});

function timedEvent(index: number, at: string | undefined, event: object): StoredEveEvent {
  const meta = at === undefined ? undefined : { at };
  return { event: { ...event, meta } as HandleMessageStreamEvent, index };
}

describe("projectActivityTimings", () => {
  it("projects tool and reasoning durations", () => {
    const timings = projectActivityTimings([
      timedEvent(0, "2026-01-01T10:00:00.000Z", {
        data: {
          actions: [{ callId: "call-1", input: {}, kind: "tool-call", toolName: "bash" }],
          sequence: 0,
          stepIndex: 0,
          turnId: "turn-1",
        },
        type: "actions.requested",
      }),
      timedEvent(1, "2026-01-01T10:00:03.000Z", {
        data: {
          result: { callId: "call-1", kind: "tool-result", output: {}, toolName: "bash" },
          sequence: 1,
          status: "completed",
          stepIndex: 0,
          turnId: "turn-1",
        },
        type: "action.result",
      }),
      timedEvent(2, "2026-01-01T10:00:04.000Z", {
        data: { sequence: 2, stepIndex: 2, turnId: "turn-1" },
        type: "step.started",
      }),
      timedEvent(3, "2026-01-01T10:00:08.000Z", {
        data: { reasoning: "thought", sequence: 3, stepIndex: 2, turnId: "turn-1" },
        type: "reasoning.completed",
      }),
    ]);
    expect(timings.get(getToolTimingKey("call-1"))).toEqual({
      endedAt: Date.parse("2026-01-01T10:00:00.000Z") + 3000,
      startedAt: Date.parse("2026-01-01T10:00:00.000Z"),
    });
    expect(timings.get(getReasoningTimingKey("turn-1", 2))).toEqual({
      endedAt: Date.parse("2026-01-01T10:00:08.000Z"),
      startedAt: Date.parse("2026-01-01T10:00:04.000Z"),
    });
  });
});
