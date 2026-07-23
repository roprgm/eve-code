import { describe, expect, it } from "vitest";

import { parseGitHubRepository } from "@/lib/github";

describe("GitHub repositories", () => {
  it.each([
    ["vercel/next.js", "vercel/next.js"],
    ["https://github.com/vercel/next.js", "vercel/next.js"],
    ["https://github.com/vercel/next.js.git/", "vercel/next.js"],
    ["git@github.com:vercel/next.js.git", "vercel/next.js"],
    ["ssh://git@github.com/vercel/next.js.git", "vercel/next.js"],
  ])("normalizes %s", (input, name) => {
    expect(parseGitHubRepository(input)).toEqual({
      name,
      url: `https://github.com/${name}.git`,
    });
  });

  it.each([
    "",
    "vercel",
    "vercel/next.js/tree/main",
    "https://gitlab.com/vercel/next.js",
    "https://github.com/vercel/next.js?tab=readme",
    "https://github.com/vercel/next.js#readme",
    "https://github.com/owner/repo;echo",
  ])("rejects %s", (input) => {
    expect(parseGitHubRepository(input)).toBeUndefined();
  });
});
