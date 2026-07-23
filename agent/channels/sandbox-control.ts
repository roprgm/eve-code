import { Sandbox } from "@vercel/sandbox";
import { DELETE, defineChannel, GET, POST } from "eve/channels";
import { z } from "zod";

import { runDetachedWorkspaceCommand } from "@/agent/lib/bash";
import { waitForPreview } from "@/agent/lib/preview";
import { previewRunSchema } from "@/lib/preview";

const route = "/eve/v1/sandbox/:sandboxId";
const sandboxIdSchema = z.string().min(1).max(256);

type SandboxMatch = { readonly name: string; readonly status: Sandbox["status"] };

async function getSandboxMatch(sandboxId: string): Promise<SandboxMatch | undefined> {
  const result = await Sandbox.list({
    limit: 1,
    namePrefix: sandboxId,
    sortBy: "name",
    sortOrder: "asc",
  });
  const match = result.sandboxes[0];
  if (match?.name === sandboxId) return match;
}

async function getSandbox(sandboxId: string, resume: boolean): Promise<Sandbox | undefined> {
  const match = await getSandboxMatch(sandboxId);
  if (!match) return;
  return Sandbox.get({ name: match.name, resume });
}

function getSandboxId(params: Readonly<Record<string, string>>): string | undefined {
  return sandboxIdSchema.safeParse(params.sandboxId).data;
}

function invalidSandbox(): Response {
  return Response.json({ error: "Invalid sandbox." }, { status: 400 });
}

export default defineChannel({
  routes: [
    GET(route, async (_request, { params }) => {
      const sandboxId = getSandboxId(params);
      if (!sandboxId) return invalidSandbox();
      const match = await getSandboxMatch(sandboxId);
      return Response.json({ status: match?.status ?? "missing" });
    }),
    POST(route, async (request, { params }) => {
      const sandboxId = getSandboxId(params);
      if (!sandboxId) return invalidSandbox();
      const body = await request.json().catch(() => undefined);
      const input = previewRunSchema.safeParse(body);
      if (!input.success) return Response.json({ error: "Invalid run command." }, { status: 400 });
      const sandbox = await getSandbox(sandboxId, true);
      if (!sandbox) return Response.json({ error: "Sandbox not found." }, { status: 404 });
      await sandbox.update({ ports: [input.data.port] });
      const command = await runDetachedWorkspaceCommand(sandbox, input.data.command);
      const url = sandbox.domain(input.data.port);
      try {
        await waitForPreview(url, input.data.port);
        return Response.json({ status: sandbox.status, url });
      } catch (error) {
        await command.kill().catch(() => undefined);
        throw error;
      }
    }),
    DELETE(route, async (_request, { params }) => {
      const sandboxId = getSandboxId(params);
      if (!sandboxId) return invalidSandbox();
      const sandbox = await getSandbox(sandboxId, false);
      if (!sandbox) return Response.json({ status: "missing" });
      await sandbox.stop();
      return Response.json({ status: "stopped" });
    }),
  ],
});
