import { describe, expect, it } from "vitest";

import { projectEveMessages, type StoredEveEvent } from "@/lib/eve-events";

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
