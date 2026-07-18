import { describe, expect, it } from "vitest";

import { shapeOutput } from "@/agent/tools/bash";

function numberedLines(count: number): string {
  return Array.from({ length: count }, (_, index) => `line ${index + 1}`).join("\n");
}

describe("shapeOutput", () => {
  it("returns short output unchanged", () => {
    const text = numberedLines(200);
    expect(shapeOutput(text)).toEqual({ text, truncated: false });
  });

  it("keeps a head and tail window with an omission marker", () => {
    const shaped = shapeOutput(numberedLines(1000));
    expect(shaped.truncated).toBe(true);
    const lines = shaped.text.split("\n");
    expect(lines[0]).toBe("line 1");
    expect(lines.at(-1)).toBe("line 1000");
    expect(lines[120]).toBe("[output truncated: 760 of 1000 lines omitted]");
    expect(lines).toHaveLength(241);
  });

  it("caps each window by bytes", () => {
    const wide = Array.from({ length: 100 }, () => "x".repeat(1000)).join("\n");
    const shaped = shapeOutput(wide);
    expect(shaped.truncated).toBe(true);
    expect(shaped.text.length).toBeLessThan(20_000);
  });

  it("always keeps at least one line per window", () => {
    const huge = ["a".repeat(10_000), "middle", "z".repeat(10_000)].join("\n");
    const shaped = shapeOutput(huge);
    expect(shaped.truncated).toBe(true);
    const lines = shaped.text.split("\n");
    expect(lines[0]).toBe("a".repeat(10_000));
    expect(lines.at(-1)).toBe("z".repeat(10_000));
  });
});
