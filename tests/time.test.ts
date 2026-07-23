import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/time";

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

describe("relative time", () => {
  it.each([
    [0, "now"],
    [59_000, "now"],
    [minute, "1m"],
    [9 * minute + 30_000, "9m"],
    [59 * minute, "59m"],
    [hour, "1h"],
    [23 * hour, "23h"],
    [day, "1d"],
    [2 * day, "2d"],
    [29 * day, "29d"],
    [30 * day, "1mo"],
    [90 * day, "3mo"],
    [360 * day, "1y"],
    [800 * day, "2y"],
  ])("formats %d ms as %s", (elapsed, label) => {
    expect(formatRelativeTime(0, elapsed)).toBe(label);
  });

  it("treats future timestamps as now", () => {
    expect(formatRelativeTime(1_000, 0)).toBe("now");
  });
});
