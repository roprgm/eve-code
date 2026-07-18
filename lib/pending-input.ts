import type { EveMessage, EveMessageInputRequest } from "eve/client";

const SESSION_LIMIT_REQUEST_MARKER = ":limit:";

export function isSessionLimitRequest(request: EveMessageInputRequest | undefined): boolean {
  return request?.requestId.includes(SESSION_LIMIT_REQUEST_MARKER) ?? false;
}

export function findPendingInput(
  messages: readonly EveMessage[],
): EveMessageInputRequest | undefined {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (message?.role !== "assistant") continue;

    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex];
      if (part?.type !== "dynamic-tool" || part.state !== "approval-requested") continue;

      const metadata = part.toolMetadata?.eve;
      if (metadata?.inputRequest && !metadata.inputResponse) {
        return metadata.inputRequest;
      }
    }

    return undefined;
  }

  return undefined;
}
