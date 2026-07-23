import { defineTool } from "eve/tools";
import { z } from "zod";

import { parseGitHubRepository } from "@/lib/github";

export default defineTool({
  description: "Clone a public GitHub repository into the current workspace.",
  inputSchema: z.object({
    repository: z.string().describe("GitHub repository in owner/repository format."),
  }),
  async execute({ repository }, ctx) {
    const parsed = parseGitHubRepository(repository);
    if (!parsed) throw new Error("Invalid GitHub repository.");

    const sandbox = await ctx.getSandbox();
    return sandbox.run({ command: `git clone ${parsed.url} .` });
  },
});
