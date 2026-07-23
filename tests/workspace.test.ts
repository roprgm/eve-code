import type { Sandbox } from "@vercel/sandbox";
import { describe, expect, it, vi } from "vitest";
import {
  createWorkspaceArchive,
  decodeWorkspaceFile,
  getWorkspacePath,
  readWorkspaceFile,
} from "@/agent/lib/workspace";

describe("workspace files", () => {
  it("keeps requested paths inside the workspace", () => {
    expect(getWorkspacePath("src/index.ts")).toBe("/workspace/src/index.ts");
    expect(getWorkspacePath("src/../README.md")).toBeUndefined();
    expect(getWorkspacePath("../etc/passwd")).toBeUndefined();
    expect(getWorkspacePath("../workspace/file.ts")).toBeUndefined();
    expect(getWorkspacePath("folder/../../etc/passwd")).toBeUndefined();
    expect(getWorkspacePath("/workspace/file.ts")).toBeUndefined();
    expect(getWorkspacePath("")).toBeUndefined();
    expect(getWorkspacePath("bad\0name")).toBeUndefined();
  });

  it("classifies workspace file contents", () => {
    expect(decodeWorkspaceFile("café.ts", Buffer.from("const café = true;"))).toEqual({
      contents: "const café = true;",
      path: "café.ts",
      status: "text",
    });
    expect(decodeWorkspaceFile("image.bin", Buffer.from([0, 1, 2])).status).toBe("binary");
    expect(decodeWorkspaceFile("invalid.txt", Buffer.from([0xc3, 0x28])).status).toBe("binary");
    expect(decodeWorkspaceFile("large.txt", Buffer.alloc(200 * 1024 + 1)).status).toBe("oversized");
  });

  it("rejects symlinks outside the workspace", async () => {
    const sandbox = { fs: { realpath: async () => "/etc/passwd" } } as unknown as Sandbox;
    await expect(readWorkspaceFile(sandbox, "linked-secret")).resolves.toBeUndefined();
  });

  it("creates and removes a temporary workspace archive", async () => {
    const archive = Buffer.from("archive");
    const readFileToBuffer = vi.fn().mockResolvedValue(archive);
    const runCommand = vi.fn().mockResolvedValue({ exitCode: 0 });
    const unlink = vi.fn().mockResolvedValue(undefined);
    const sandbox = { fs: { unlink }, readFileToBuffer, runCommand } as unknown as Sandbox;

    await expect(createWorkspaceArchive(sandbox)).resolves.toBe(archive);
    const command = runCommand.mock.calls[0]?.[0];
    const archivePath = command.args[1];
    expect(command).toMatchObject({ cmd: "tar" });
    expect(command.args).toEqual([
      "-czf",
      archivePath,
      "--exclude=node_modules",
      "-C",
      "/workspace",
      ".",
    ]);
    expect(readFileToBuffer).toHaveBeenCalledWith({ path: archivePath });
    expect(unlink).toHaveBeenCalledWith(archivePath);
  });
});
