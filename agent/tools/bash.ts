import { Sandbox } from "@vercel/sandbox";
import { defineTool } from "eve/tools";
import { bash } from "eve/tools/defaults";

import {
  recordActiveCommand,
  runDetachedWorkspaceCommand,
  watchCommand,
} from "@/agent/bash-command";

export default defineTool({
  ...bash,
  description:
    "Execute a shell command in the shared workspace environment. Every command must exit on its own and is killed if the turn is stopped; servers, watchers, and REPLs belong to start_dev.",
  async execute({ command }: { readonly command: string }, ctx) {
    const session = await ctx.getSandbox();
    const sandbox = await Sandbox.get({ name: session.id, resume: false, signal: ctx.abortSignal });
    const running = await runDetachedWorkspaceCommand(sandbox, command, ctx.abortSignal);
    await recordActiveCommand(sandbox, running.cmdId);
    return await watchCommand(running, ctx.abortSignal);
  },
});
