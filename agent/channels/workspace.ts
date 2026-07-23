import { Sandbox } from "@vercel/sandbox";
import { defineChannel, GET } from "eve/channels";
import { z } from "zod";

import { getActiveCommandLogStream } from "@/agent/lib/bash";
import {
  createWorkspaceArchive,
  getWorkspacePath,
  listWorkspaceFiles,
  readWorkspaceFile,
} from "@/agent/lib/workspace";
import { workspacePathSchema } from "@/lib/workspace";

const route = "/eve/v1/workspace/:sessionId";
const sessionIdSchema = z.string().min(1).max(256);

async function getSandbox(sessionId: string): Promise<Sandbox | undefined> {
  const result = await Sandbox.list({
    limit: 1,
    sortBy: "createdAt",
    sortOrder: "desc",
    tags: { sessionId },
  });
  const match = result.sandboxes[0];
  if (!match) return;
  return Sandbox.get({ name: match.name, resume: true });
}

function getSessionId(params: Readonly<Record<string, string>>): string | undefined {
  return sessionIdSchema.safeParse(params.sessionId).data;
}

function invalidRequest(): Response {
  return Response.json({ error: "Invalid workspace request." }, { status: 400 });
}

export default defineChannel({
  routes: [
    GET(route, async (_request, { params }) => {
      const sessionId = getSessionId(params);
      if (!sessionId) return invalidRequest();
      const sandbox = await getSandbox(sessionId);
      if (!sandbox) return Response.json([]);
      return Response.json(await listWorkspaceFiles(sandbox));
    }),
    GET(`${route}/command`, async (_request, { params }) => {
      const sessionId = getSessionId(params);
      if (!sessionId) return invalidRequest();
      const sandbox = await getSandbox(sessionId);
      const commandLogs = sandbox ? await getActiveCommandLogStream(sandbox) : undefined;
      if (!commandLogs) return new Response(null, { status: 204 });
      return new Response(commandLogs, {
        headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
      });
    }),
    GET(`${route}/download`, async (_request, { params }) => {
      const sessionId = getSessionId(params);
      if (!sessionId) return invalidRequest();
      const sandbox = await getSandbox(sessionId);
      if (!sandbox) return Response.json({ error: "Workspace not found." }, { status: 404 });
      const archive = await createWorkspaceArchive(sandbox);
      return new Response(Uint8Array.from(archive), {
        headers: {
          "cache-control": "no-store",
          "content-disposition": 'attachment; filename="workspace.tar.gz"',
          "content-length": String(archive.byteLength),
          "content-type": "application/gzip",
        },
      });
    }),
    GET(`${route}/file`, async (request, { params }) => {
      const sessionId = getSessionId(params);
      const path = workspacePathSchema.safeParse(
        new URL(request.url).searchParams.get("path"),
      ).data;
      if (!sessionId || !path || !getWorkspacePath(path)) return invalidRequest();
      const sandbox = await getSandbox(sessionId);
      if (!sandbox) return Response.json({ path, status: "missing" });
      const file = await readWorkspaceFile(sandbox, path);
      if (!file) return invalidRequest();
      return Response.json(file);
    }),
  ],
});
