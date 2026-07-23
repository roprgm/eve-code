import { defineTool } from "eve/tools";
import { z } from "zod";

import { parseGitHubRepository } from "@/lib/github";
import { joinNonEmptyLines } from "@/lib/text";

export default defineTool({
  description:
    "Clone a public GitHub repository into the current workspace and list its root entries.",
  inputSchema: z.object({
    repository: z.string().describe("GitHub repository in owner/repository format."),
  }),
  async execute({ repository }, ctx) {
    const parsed = parseGitHubRepository(repository);
    if (!parsed) throw new Error("Invalid GitHub repository.");

    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: `git clone --quiet ${parsed.url} . && find /workspace -mindepth 1 -maxdepth 1 ! -name .git -printf '%f\\n' | sort | head -200`,
    });
  },
  toModelOutput(output) {
    if (output.exitCode !== 0) {
      return {
        type: "text",
        value: joinNonEmptyLines([output.stdout, output.stderr]) || "Repository clone failed.",
      };
    }
    return {
      type: "text",
      value: `Repository cloned into /workspace.\nRoot entries (up to 200):\n${output.stdout.trim() || "(empty repository)"}`,
    };
  },
});
