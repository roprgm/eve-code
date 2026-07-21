import { defineTool } from "eve/tools";
import { writeFile } from "eve/tools/defaults";

export default defineTool({
  ...writeFile,
  description: "Create a new file. Fails if it already exists; use edit_file instead.",
  async execute(input: { content: string; filePath: string }, ctx) {
    const sandbox = await ctx.getSandbox();
    if ((await sandbox.readTextFile({ path: input.filePath })) !== null) {
      throw new Error(`File already exists: ${input.filePath}. Use edit_file instead.`);
    }
    return writeFile.execute(input, ctx);
  },
});
