import { defineTool } from "eve/tools";
import { z } from "zod";

import { applyFileEdits, queueFileMutation } from "@/agent/lib/files";
import { computeFileDiff, fileDiffSchema } from "@/lib/file-diff";

const editSchema = z.object({
  newText: z.string().max(100_000),
  oldText: z.string().min(1).max(100_000),
});

export default defineTool({
  description:
    "Replace one or more exact, unique, non-overlapping text ranges in an existing file. Every oldText is matched against the original file, so use one call for multiple changes to the same file.",
  inputSchema: z.object({
    edits: z.array(editSchema).min(1).max(50),
    filePath: z.string().min(1).max(4_096),
  }),
  outputSchema: fileDiffSchema,
  async execute({ edits, filePath }, ctx) {
    const sandbox = await ctx.getSandbox();
    const path = sandbox.resolvePath(filePath);
    return queueFileMutation(`${sandbox.id}:${path}`, async () => {
      ctx.abortSignal.throwIfAborted();
      const original = await sandbox.readTextFile({ abortSignal: ctx.abortSignal, path });
      if (original === null) throw new Error(`File not found: ${filePath}`);

      const edited = applyFileEdits(original, edits);
      const output = computeFileDiff(filePath, original, edited);
      if (!output) throw new Error("The edit did not produce a safe diff.");

      ctx.abortSignal.throwIfAborted();
      await sandbox.writeTextFile({ abortSignal: ctx.abortSignal, content: edited, path });
      return output;
    });
  },
  toModelOutput() {
    return { type: "text", value: "File edited." };
  },
});
