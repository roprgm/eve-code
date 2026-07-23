import { randomUUID } from "node:crypto";
import { posix } from "node:path";
import type { Sandbox } from "@vercel/sandbox";

import { type WorkspaceFile, workspacePathCountMax, workspacePathsSchema } from "@/lib/workspace";

const workspaceRoot = "/workspace";
const fileSizeBytesMax = 200 * 1024;
const archiveScript = `
import os, sys, zipfile
root, output = sys.argv[1:]
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for directory, names, files in os.walk(root):
        names[:] = [name for name in names if name != "node_modules" and not os.path.islink(os.path.join(directory, name))]
        for name in files:
            path = os.path.join(directory, name)
            if not os.path.islink(path):
                archive.write(path, os.path.relpath(path, root))
`;
const hiddenDirectoryPattern =
  ".*/(\\.git|node_modules|\\.venv|venv|\\.next|\\.nuxt|\\.svelte-kit|\\.turbo)";
const findArgs = [
  workspaceRoot,
  "-regextype",
  "posix-extended",
  "-type",
  "d",
  "-regex",
  hiddenDirectoryPattern,
  "-prune",
  "-o",
  "-type",
  "f",
  "-print0",
];

export function getWorkspacePath(path: string): string | undefined {
  if (!path || path.includes("\0")) return;
  const resolved = posix.resolve(workspaceRoot, path);
  if (!resolved.startsWith(`${workspaceRoot}/`)) return;
  if (posix.relative(workspaceRoot, resolved) !== path) return;
  return resolved;
}

export function decodeWorkspaceFile(path: string, contents: Buffer): WorkspaceFile {
  if (contents.byteLength > fileSizeBytesMax) return { path, status: "oversized" };
  if (contents.includes(0)) return { path, status: "binary" };
  try {
    return {
      contents: new TextDecoder("utf-8", { fatal: true }).decode(contents),
      path,
      status: "text",
    };
  } catch {
    return { path, status: "binary" };
  }
}

export async function createWorkspaceArchive(sandbox: Sandbox): Promise<Buffer> {
  const archivePath = `/tmp/eve-code-${randomUUID()}.zip`;
  try {
    const command = await sandbox.runCommand({
      args: ["-c", archiveScript, workspaceRoot, archivePath],
      cmd: "python3",
      cwd: workspaceRoot,
      timeoutMs: 60_000,
    });
    if (command.exitCode !== 0) throw new Error("Could not archive the workspace.");
    return await sandbox.fs.readFile(archivePath);
  } finally {
    await sandbox.fs.unlink(archivePath).catch(() => undefined);
  }
}

export async function listWorkspaceFiles(sandbox: Sandbox): Promise<string[]> {
  const command = await sandbox.runCommand({ args: findArgs, cmd: "find" });
  if (command.exitCode !== 0) throw new Error("Could not list workspace files.");
  const output = await command.stdout();
  const paths = output
    .split("\0", workspacePathCountMax + 1)
    .filter(Boolean)
    .map((path) => posix.relative(workspaceRoot, path));
  return workspacePathsSchema.parse(paths);
}

export async function readWorkspaceFile(
  sandbox: Sandbox,
  path: string,
): Promise<WorkspaceFile | undefined> {
  const workspacePath = getWorkspacePath(path);
  if (!workspacePath) return;

  try {
    const realPath = await sandbox.fs.realpath(workspacePath);
    if (!realPath.startsWith(`${workspaceRoot}/`)) return;
    const stat = await sandbox.fs.stat(realPath);
    if (!stat.isFile()) return { path, status: "missing" };
    if (stat.size > fileSizeBytesMax) return { path, status: "oversized" };
    return decodeWorkspaceFile(path, await sandbox.fs.readFile(realPath));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return { path, status: "missing" };
    throw error;
  }
}
