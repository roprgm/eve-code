import type { Command, Sandbox } from "@vercel/sandbox";

const activeCommandPath = "/tmp/eve-active-command";

const outputCharactersMax = 50_000;

type FinishedCommand = {
  readonly exitCode: number;
  stderr(): PromiseLike<string>;
  stdout(): PromiseLike<string>;
};

type SandboxCommand = {
  kill(): PromiseLike<unknown>;
  wait(params?: { signal?: AbortSignal }): PromiseLike<FinishedCommand>;
};

type CommandResult = {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
  readonly truncated: boolean;
};

function truncateTail(output: string): { text: string; truncated: boolean } {
  if (output.length <= outputCharactersMax) return { text: output, truncated: false };
  return {
    text: `[truncated: showing the last ${outputCharactersMax} characters]\n${output.slice(-outputCharactersMax)}`,
    truncated: true,
  };
}

export function streamCommandLogs(
  logs: AsyncIterator<{ readonly data: string }> & { close(): void },
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const next = await logs.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(next.value.data));
    },
    cancel() {
      logs.close();
    },
  });
}

export async function getActiveCommandLogStream(
  sandbox: Sandbox,
): Promise<ReadableStream<Uint8Array> | undefined> {
  try {
    const commandId = (await sandbox.fs.readFile(activeCommandPath, "utf8")).trim();
    if (!commandId) return;
    const command = await sandbox.getCommand(commandId);
    return streamCommandLogs(command.logs());
  } catch {
    return;
  }
}

export function runDetachedWorkspaceCommand(
  sandbox: Sandbox,
  command: string,
  signal?: AbortSignal,
): Promise<Command> {
  return sandbox.runCommand({
    args: ["-lc", command],
    cmd: "bash",
    cwd: "/workspace",
    detached: true,
    signal,
  });
}

export async function recordActiveCommand(sandbox: Sandbox, commandId: string): Promise<void> {
  await sandbox
    .writeFiles([{ content: Buffer.from(commandId), path: activeCommandPath }])
    .catch(() => undefined);
}

export async function watchCommand(
  command: SandboxCommand,
  signal: AbortSignal,
): Promise<CommandResult> {
  try {
    const finished = await command.wait({ signal });
    const [stdout, stderr] = await Promise.all([finished.stdout(), finished.stderr()]);
    const out = truncateTail(stdout);
    const err = truncateTail(stderr);
    return {
      exitCode: finished.exitCode,
      stderr: err.text,
      stdout: out.text,
      truncated: out.truncated || err.truncated,
    };
  } catch (error) {
    await Promise.resolve(command.kill()).catch(() => undefined);
    if (signal.aborted && signal.reason instanceof Error) throw signal.reason;
    throw error;
  }
}
