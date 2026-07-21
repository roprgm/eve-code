import { Sandbox } from "@vercel/sandbox";
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Start a development server and expose its port as a live preview.",
  inputSchema: z.object({
    command: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe("The project-specific command that starts its dev server on 0.0.0.0."),
    port: z
      .number()
      .int()
      .min(1)
      .max(65_535)
      .describe("The exact configured or framework-default port used by the dev server."),
  }),
  outputSchema: z.object({ sandboxId: z.string(), url: z.string().url() }),
  async execute({ command, port }, ctx) {
    const session = await ctx.getSandbox();
    const sandbox = await Sandbox.get({ name: session.id, resume: false, signal: ctx.abortSignal });
    await sandbox.update({ ports: [port] }, { signal: ctx.abortSignal });
    await session.spawn({ command });
    return { sandboxId: session.id, url: sandbox.domain(port) };
  },
});
