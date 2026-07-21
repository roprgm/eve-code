import { defineTool } from "eve/tools";
import { z } from "zod";

import { applyFileEdits, computeFileDiff } from "@/agent/file-edit";

const MAX_FILE_BYTES = 5_000_000;
const MAX_OUTPUT_CHARACTERS = 500_000;

const fileMutations = new Map<string, Promise<void>>();

const editSchema = z.object({
  newText: z.string().max(100_000),
  oldText: z.string().min(1).max(100_000),
});

const fileDiffSchema = z.object({ diff: z.string().min(1) });

async function queueFileMutation<T>(key: string, mutation: () => Promise<T>): Promise<T> {
  const previous = fileMutations.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(mutation);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  fileMutations.set(key, settled);
  try {
    return await result;
  } finally {
    if (fileMutations.get(key) === settled) fileMutations.delete(key);
  }
}

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
      if (Buffer.byteLength(original, "utf8") > MAX_FILE_BYTES) {
        throw new Error("The file is too large to edit safely.");
      }

      const edited = applyFileEdits(original, edits);
      const output = computeFileDiff(filePath, original, edited);
      if (output.diff.length > MAX_OUTPUT_CHARACTERS) {
        throw new Error("The resulting diff is too large to store.");
      }

      ctx.abortSignal.throwIfAborted();
      await sandbox.writeTextFile({ abortSignal: ctx.abortSignal, content: edited, path });
      return output;
    });
  },
  toModelOutput() {
    return { type: "text", value: "File edited." };
  },
});
