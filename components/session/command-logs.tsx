import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { CodeBlock } from "@/components/ui/code-block";
import { getWorkspaceUrl } from "@/lib/workspace";

const displayCharactersMax = 4_000;
const reconnectDelayMs = 700;

const CommandLogsContext = createContext("");

export function CommandLogsProvider({
  children,
  sessionId,
}: {
  readonly children: ReactNode;
  readonly sessionId: string;
}) {
  return <CommandLogsContext.Provider value={sessionId}>{children}</CommandLogsContext.Provider>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readLogStream(
  body: ReadableStream<Uint8Array>,
  onOutput: (output: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let output = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    output = (output + decoder.decode(value, { stream: true })).slice(-displayCharactersMax);
    onOutput(output);
  }
}

async function followCommandLogs(
  sessionId: string,
  signal: AbortSignal,
  onOutput: (output: string) => void,
): Promise<void> {
  const url = `${getWorkspaceUrl(sessionId)}/command`;
  while (!signal.aborted) {
    try {
      const response = await fetch(url, { cache: "no-store", signal });
      if (response.ok && response.body) await readLogStream(response.body, onOutput);
    } catch {
      if (signal.aborted) return;
    }
    await sleep(reconnectDelayMs);
  }
}

export function CommandLogs() {
  const sessionId = useContext(CommandLogsContext);
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    void followCommandLogs(sessionId, controller.signal, setOutput);
    return () => controller.abort();
  }, [sessionId]);

  if (!output) return null;
  return <CodeBlock>{output}</CodeBlock>;
}
