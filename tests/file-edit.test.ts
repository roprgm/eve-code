import { getSingularPatch } from "@pierre/diffs";
import type { ToolContext } from "eve/tools";
import { describe, expect, it } from "vitest";

import { applyFileEdits, computeFileDiff } from "@/agent/file-edit";
import editFile from "@/agent/tools/edit_file";
import writeFile from "@/agent/tools/write_file";

describe("file edits", () => {
  it("applies multiple edits against the original snapshot", () => {
    const original = "body {\n  color: red;\n  background: white;\n}\n";
    const edited = applyFileEdits(original, [
      { newText: "color: blue;", oldText: "color: red;" },
      { newText: "background: black;", oldText: "background: white;" },
    ]);
    expect(edited).toBe("body {\n  color: blue;\n  background: black;\n}\n");
  });

  it("changes only the matched bytes", () => {
    const original = "\uFEFFfirst\r\nsecond\r\nthird\r\n";
    const edited = applyFileEdits(original, [{ newText: "changed", oldText: "second" }]);
    expect(edited).toBe("\uFEFFfirst\r\nchanged\r\nthird\r\n");
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
    const original = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n");
    const edited = original.replace("line 2", "changed").replace("line 19", "also changed");
    const result = computeFileDiff("src/style.css", original, edited);
    expect(result.diff).toContain("-line 2");
    expect(result.diff).toContain("+changed");
    expect(result.diff.split("\n").filter((line) => line.startsWith("@@"))).toHaveLength(2);
    expect(getSingularPatch(result.diff).name).toBe("src/style.css");
  });

  it("serializes the complete read-modify-write for each file", async () => {
    let content = "color: red;\n";
    const sandbox = {
      id: "sandbox-1",
      readTextFile: async () => {
        await Promise.resolve();
        return content;
      },
      resolvePath: (path: string) => `/workspace/${path}`,
      writeTextFile: async ({ content: next }: { content: string }) => {
        content = next;
      },
    };
    const ctx = {
      abortSignal: new AbortController().signal,
      getSandbox: async () => sandbox,
    } as unknown as ToolContext;

    await Promise.all([
      editFile.execute(
        { edits: [{ newText: "color: blue;", oldText: "color: red;" }], filePath: "style.css" },
        ctx,
      ),
      editFile.execute(
        {
          edits: [{ newText: "color: green;", oldText: "color: blue;" }],
          filePath: "style.css",
        },
        ctx,
      ),
    ]);

    expect(content).toBe("color: green;\n");
  });

  it("rejects existing files in write_file", async () => {
    const ctx = {
      getSandbox: async () => ({ readTextFile: async () => "" }),
    } as unknown as ToolContext;
    await expect(
      writeFile.execute({ content: "new", filePath: "/workspace/file.ts" }, ctx),
    ).rejects.toThrow("Use edit_file instead");
  });
});
