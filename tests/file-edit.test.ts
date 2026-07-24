import { parsePatch } from "diff";
import type { ToolContext } from "eve/tools";
import { writeFile as eveWriteFile } from "eve/tools/defaults";
import { afterEach, describe, expect, it, vi } from "vitest";

import { applyFileEdits } from "@/agent/lib/files";
import editFile from "@/agent/tools/edit_file";
import writeFile from "@/agent/tools/write_file";
import { computeFileDiff, getFileDiffStats } from "@/lib/file-diff";

afterEach(() => vi.restoreAllMocks());

describe("file edits", () => {
  it("applies edits against the original bytes", () => {
    const original = "body {\n  color: red;\n  background: white;\n}\n";
    const edited = applyFileEdits(original, [
      { newText: "color: blue;", oldText: "color: red;" },
      { newText: "background: black;", oldText: "background: white;" },
    ]);
    expect(edited).toBe("body {\n  color: blue;\n  background: black;\n}\n");

    const exact = "\uFEFFfirst\r\nsecond\r\nthird\r\n";
    expect(applyFileEdits(exact, [{ newText: "changed", oldText: "second" }])).toBe(
      "\uFEFFfirst\r\nchanged\r\nthird\r\n",
    );
  });

  it("rejects missing, repeated, unchanged, and overlapping edits", () => {
    expect(() => applyFileEdits("one\n", [{ newText: "two", oldText: "missing" }])).toThrow(
      "oldText was not found",
    );
    expect(() => applyFileEdits("one one\n", [{ newText: "two", oldText: "one" }])).toThrow(
      "matches more than once",
    );
    expect(() => applyFileEdits("aaa", [{ newText: "b", oldText: "aa" }])).toThrow(
      "matches more than once",
    );
    expect(() => applyFileEdits("one\n", [{ newText: "one", oldText: "one" }])).toThrow(
      "are identical",
    );
    expect(() =>
      applyFileEdits("one two\n", [
        { newText: "three", oldText: "one two" },
        { newText: "four", oldText: "two" },
      ]),
    ).toThrow("Edits overlap");
  });

  it("creates a context-limited unified diff", () => {
    const original = Array.from({ length: 20 }, (_, index) => {
      if (index === 18) return "--- literal content";
      return `line ${index + 1}`;
    }).join("\n");
    const edited = original
      .replace("line 2", "changed")
      .replace("--- literal content", "+++ literal content");
    const diff = computeFileDiff("src/style.css", original, edited)?.diff ?? "";
    expect(diff).toContain("-line 2");
    expect(diff).toContain("+changed");
    expect(diff).toContain("---- literal content");
    expect(diff).toContain("++++ literal content");
    expect(diff.split("\n").filter((line) => line.startsWith("@@"))).toHaveLength(2);
    expect(getFileDiffStats(diff)).toEqual({ additions: 2, deletions: 2 });
    expect(parsePatch(diff)[0]?.newFileName).toBe("src/style.css");
    const created = computeFileDiff("new.ts", null, "first\nsecond\n")?.diff ?? "";
    expect(getFileDiffStats(created)).toEqual({ additions: 2, deletions: 0 });
    expect(computeFileDiff("same.ts", edited, edited)).toBeUndefined();
  });

  it("preserves native writes and serializes file mutations", async () => {
    let content: string | null = "color: red;\n";
    const sandbox = {
      id: "sandbox-1",
      readTextFile: async () => {
        await Promise.resolve();
        return content;
      },
      resolvePath: (path: string) => path,
      writeTextFile: async ({ content: next }: { content: string }) => {
        content = next;
      },
    };
    const ctx = {
      abortSignal: new AbortController().signal,
      getSandbox: async () => sandbox,
    } as unknown as ToolContext;
    vi.spyOn(eveWriteFile, "execute").mockImplementation(async (input) => {
      const write = input as { content: string; filePath: string };
      const existed = content !== null;
      await sandbox.writeTextFile({ content: write.content });
      return { existed, path: write.filePath };
    });

    const replacement = writeFile.execute(
      { content: "color: blue;\n", filePath: "/workspace/style.css" },
      ctx,
    );
    const targetedEdit = editFile.execute(
      {
        edits: [{ newText: "color: green;", oldText: "color: blue;" }],
        filePath: "/workspace/style.css",
      },
      ctx,
    );
    const [result] = await Promise.all([replacement, targetedEdit]);

    expect(result.diff).toContain("-color: red;");
    expect(result.diff).toContain("+color: blue;");
    expect(content).toBe("color: green;\n");

    content = null;
    const created = await writeFile.execute(
      { content: "first\nsecond\n", filePath: "/workspace/new.ts" },
      ctx,
    );
    expect(created).toMatchObject({ existed: false, path: "/workspace/new.ts" });
    expect(getFileDiffStats(created.diff ?? "")).toEqual({ additions: 2, deletions: 0 });
  });
});
