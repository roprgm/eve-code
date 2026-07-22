import { Sandbox } from "@vercel/sandbox";
import { defineTool } from "eve/tools";

import { previewOutputSchema, previewRunSchema } from "@/lib/preview";

export default defineTool({
  description: "Start a development server and expose its port as a live preview.",
  inputSchema: previewRunSchema,
  outputSchema: previewOutputSchema,
  async execute({ command, port }, ctx) {
    const session = await ctx.getSandbox();
    const sandbox = await Sandbox.get({ name: session.id, resume: false, signal: ctx.abortSignal });
    await sandbox.update({ ports: [port] }, { signal: ctx.abortSignal });
    await session.spawn({ command });
    return { sandboxId: session.id, url: sandbox.domain(port) };
  },
});
