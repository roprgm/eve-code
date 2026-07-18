import { defineTool, type ToolContext } from "eve/tools";
import { bash } from "eve/tools/defaults";

const WINDOW_LINES = 120;
const WINDOW_BYTES = 8_192;

type CommandOutput = {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
  readonly truncated: boolean;
};

function takeWindow(lines: readonly string[]): string[] {
  const taken: string[] = [];
  let bytes = 0;
  for (const line of lines) {
    const size = Buffer.byteLength(line, "utf8") + 1;
    if (taken.length > 0 && (taken.length >= WINDOW_LINES || bytes + size > WINDOW_BYTES)) break;
    taken.push(line);
    bytes += size;
  }
  return taken;
}

export function shapeOutput(text: string): { text: string; truncated: boolean } {
  const lines = text.split("\n");
  const head = takeWindow(lines);
  if (head.length === lines.length) return { text, truncated: false };

  const rest = lines.slice(head.length);
  const tail = takeWindow([...rest].reverse()).reverse();
  const omitted = rest.length - tail.length;
  if (omitted === 0) return { text, truncated: false };

  const marker = `[output truncated: ${omitted} of ${lines.length} lines omitted]`;
  return { text: [...head, marker, ...tail].join("\n"), truncated: true };
}

export default defineTool({
  ...bash,
  async execute(input: unknown, ctx: ToolContext) {
    const output = (await bash.execute(input, ctx)) as CommandOutput;
    const stdout = shapeOutput(output.stdout);
    const stderr = shapeOutput(output.stderr);
    return {
      exitCode: output.exitCode,
      stderr: stderr.text,
      stdout: stdout.text,
      truncated: output.truncated || stdout.truncated || stderr.truncated,
    };
  },
});
