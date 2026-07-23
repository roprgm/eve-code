import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForPreview } from "@/agent/lib/preview";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("preview", () => {
  it("accepts a reachable public URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ready")));

    await expect(waitForPreview("https://preview.test", 5173)).resolves.toBeUndefined();
  });

  it("rejects a server that is not publicly reachable", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));

    const result = expect(waitForPreview("https://preview.test", 5173)).rejects.toThrow(
      'server: { host: "0.0.0.0", allowedHosts: true }',
    );
    await vi.runAllTimersAsync();
    await result;
  });
});
