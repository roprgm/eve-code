import { describe, expect, it } from "vitest";

import { streamCommandLogs, watchCommand } from "@/agent/bash-command";

function finished(exitCode: number, stdout: string, stderr: string) {
  return { exitCode, stderr: async () => stderr, stdout: async () => stdout };
}

describe("bash commands", () => {
  it("returns the finished command's output", async () => {
    const command = { kill: async () => {}, wait: async () => finished(0, "done", "warned") };
    const result = await watchCommand(command, new AbortController().signal);
    expect(result).toEqual({ exitCode: 0, stderr: "warned", stdout: "done", truncated: false });
  });

  it("kills a running command when the turn is stopped", async () => {
    let killed = false;
    const command = {
      kill: async () => {
        killed = true;
      },
      wait: (params?: { signal?: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          params?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
    };
    const controller = new AbortController();
    const run = watchCommand(command, controller.signal);
    controller.abort(new Error("stopped"));
    await expect(run).rejects.toThrow("stopped");
    expect(killed).toBe(true);
  });

  it("truncates oversized output from the tail", async () => {
    const command = {
      kill: async () => {},
      wait: async () => finished(0, `start${"x".repeat(60_000)}end`, ""),
    };
    const result = await watchCommand(command, new AbortController().signal);
    expect(result.truncated).toBe(true);
    expect(result.stdout).toContain("[truncated");
    expect(result.stdout.endsWith("end")).toBe(true);
  });

  it("streams command log lines until the source ends", async () => {
    const lines = [{ data: "one\n" }, { data: "two\n" }];
    const source = {
      close() {},
      async next() {
        const value = lines.shift();
        if (!value) return { done: true as const, value: undefined };
        return { done: false as const, value };
      },
    };
    expect(await new Response(streamCommandLogs(source)).text()).toBe("one\ntwo\n");
  });
});
