import { useConvexMutation } from "@convex-dev/react-query";
import type { EveMessage, EveMessagePart, SendTurnPayload, SessionState } from "eve/client";
import { useEffect, useMemo } from "react";

import { api } from "@/convex/_generated/api";
import { projectActivityTimings, projectEveMessages, type StoredEveEvent } from "@/lib/eve-events";
import { findPendingInput, isSessionLimitRequest } from "@/lib/pending-input";
import {
  clearSessionRuntime,
  followSession,
  type SessionRuntime,
  sendTurn,
  stopSession,
  useSessionRuntime,
} from "@/lib/session-runtime";

export type SessionStatus = "error" | "ready" | "running" | "stopping";

export type StoredSession = {
  readonly continuationToken?: string;
  readonly eveSessionId?: string;
  readonly status: SessionStatus;
  readonly streamIndex: number;
};

type UseSessionOptions = {
  readonly checkpointEvents: readonly StoredEveEvent[];
  readonly session?: StoredSession;
  readonly sessionId: string;
};

function toSessionState(session: StoredSession): SessionState {
  return {
    continuationToken: session.continuationToken,
    sessionId: session.eveSessionId,
    streamIndex: session.streamIndex,
  };
}

function isVisiblePart(part: EveMessagePart): boolean {
  if (part.type === "dynamic-tool") return true;
  if (part.type === "text" || part.type === "reasoning") return part.text.trim().length > 0;
  return false;
}

function hasAssistantActivityAfterLatestUser(messages: readonly EveMessage[]): boolean {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role === "user") return false;
    if (message.parts.some(isVisiblePart)) return true;
  }
  return false;
}

function sessionError(
  limitReached: boolean,
  runtimeError: string | undefined,
  session: StoredSession | undefined,
): string | undefined {
  if (limitReached) {
    return "This conversation reached its token limit. Start a new session to continue.";
  }
  if (runtimeError) return runtimeError;
  if (session?.status !== "error") return;
  if (session.continuationToken) {
    return "This conversation stopped unexpectedly. Send another message to try again.";
  }
  return "This conversation ended unexpectedly. Start a new session to continue.";
}

function activityLabel(
  isGenerating: boolean,
  messages: readonly EveMessage[],
  hasInput: boolean,
  error: string | undefined,
): string | undefined {
  if (!isGenerating) return;
  if (hasInput) return;
  if (hasAssistantActivityAfterLatestUser(messages)) return;
  if (error) return;
  return "Thinking...";
}

function availableInput(input: ReturnType<typeof findPendingInput>) {
  if (isSessionLimitRequest(input)) return;
  return input;
}

function isCheckpointed(
  session: StoredSession | undefined,
  runtime: SessionRuntime | undefined,
): boolean {
  if (!session) return false;
  if (!runtime) return false;
  if (!runtime.events.length) return session.streamIndex > runtime.connection.index;
  return session.streamIndex >= runtime.connection.index;
}

export function useSession({ checkpointEvents, session, sessionId }: UseSessionOptions) {
  const status = session?.status;
  const runtime = useSessionRuntime(sessionId);
  const runtimeStatus = runtime?.connection.status;
  const cursor = session?.streamIndex ?? 0;
  const events = useMemo(() => {
    const live = runtime?.events.filter((event) => event.index >= cursor) ?? [];
    return [...checkpointEvents, ...live];
  }, [checkpointEvents, cursor, runtime?.events]);
  const messages = useMemo(
    () => projectEveMessages(events, runtime?.optimistic),
    [events, runtime?.optimistic],
  );
  const timings = useMemo(() => projectActivityTimings(events), [events]);
  const checkpointed = isCheckpointed(session, runtime);

  useEffect(() => {
    if (status === "running" && session) followSession(sessionId, toSessionState(session));
    if (!runtimeStatus || runtimeStatus === "running") return;
    if (checkpointed || status === "error") clearSessionRuntime(sessionId);
  }, [checkpointed, runtimeStatus, session, sessionId, status]);

  const prepareTurn = useConvexMutation(api.persistence.prepareTurn);
  const requestTurnStop = useConvexMutation(api.persistence.requestTurnStop);

  const pendingInput = findPendingInput(messages);
  const visibleInput = availableInput(pendingInput);
  const sessionLimitReached = isSessionLimitRequest(pendingInput);
  const needsOption = Boolean(visibleInput?.options?.length && !visibleInput.allowFreeform);
  const running = (runtimeStatus ?? status) === "running";
  const stopping = runtimeStatus === "stopped" || status === "stopping";
  const active = running || stopping;
  const ended = Boolean(session?.eveSessionId && !session.continuationToken);
  const isGenerating = running;
  const error = sessionError(sessionLimitReached, runtime?.error, session);
  const canContinue = !sessionLimitReached && !ended;
  const waitingForCheckpoint = Boolean(runtime?.events.length) && !checkpointed;
  const canSend = canContinue && !waitingForCheckpoint;
  const acceptsText = Boolean(session) && canSend && !needsOption;
  const disabled = active || !acceptsText;

  function send(input: SendTurnPayload): void {
    if (!session) return;
    if (active || !canSend) return;
    sendTurn(sessionId, input, {
      beforeSend: prepareTurn({ sessionId, streamIndex: cursor }),
      sessionState: toSessionState(session),
    });
  }

  function sendMessage(message: string): void {
    if (!visibleInput) {
      send({ message });
      return;
    }
    send({ inputResponses: [{ requestId: visibleInput.requestId, text: message }] });
  }

  function answerQuestion(optionId: string): void {
    if (!visibleInput) return;
    send({ inputResponses: [{ requestId: visibleInput.requestId, optionId }] });
  }

  function stop(): void {
    void requestTurnStop({ sessionId, streamIndex: cursor }).then(
      (scheduled) => {
        if (!scheduled) clearSessionRuntime(sessionId);
      },
      () => clearSessionRuntime(sessionId),
    );
    void stopSession(sessionId, session && toSessionState(session));
  }

  return {
    answerQuestion,
    activityLabel: activityLabel(isGenerating, messages, Boolean(pendingInput), error),
    disabled,
    error,
    isGenerating,
    isStopping: stopping,
    messages,
    pendingInput: visibleInput,
    sendMessage,
    stop,
    timings,
  };
}
