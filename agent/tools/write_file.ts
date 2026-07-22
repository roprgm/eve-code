import { defineTool } from "eve/tools";
import { writeFile } from "eve/tools/defaults";
import { z } from "zod";

import { queueFileMutation } from "@/agent/file-edit";
import { computeFileDiff, fileDiffSchema } from "@/lib/file-diff";

const writeFileOutputSchema = fileDiffSchema.partial().extend({
  existed: z.boolean(),
  path: z.string(),
});

export default defineTool({
  ...writeFile,
  outputSchema: writeFileOutputSchema,
  async execute(input: { content: string; filePath: string }, ctx) {
    const sandbox = await ctx.getSandbox();
    const path = sandbox.resolvePath(input.filePath);
    return queueFileMutation(`${sandbox.id}:${path}`, async () => {
      ctx.abortSignal.throwIfAborted();
      const original = await sandbox.readTextFile({ abortSignal: ctx.abortSignal, path });
      const fileDiff = computeFileDiff(input.filePath, original, input.content);
      ctx.abortSignal.throwIfAborted();
      const result = writeFileOutputSchema.parse(await writeFile.execute(input, ctx));
      if (!result.existed) return result;
      if (!fileDiff) return result;
      return { ...result, ...fileDiff };
    });
  },
  toModelOutput() {
    return { type: "text", value: "File written." };
  },
});
