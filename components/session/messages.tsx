import type { EveMessage, EveMessagePart } from "eve/client";
import { Brain } from "lucide-react";
import { Streamdown } from "streamdown";

import { AssistantMessage, MessageActions, UserMessage } from "@/components/chat/message";
import { ThreadMessage } from "@/components/chat/thread";
import { InputRequest } from "@/components/session/input-request";
import { ModelActivity, useElapsed } from "@/components/session/model-activity";
import { ToolActivity } from "@/components/session/tool-activity";
import type { useSession } from "@/components/session/use-session";
import { type ActivityTiming, getReasoningTimingKey, getToolTimingKey } from "@/lib/eve-events";

import "streamdown/styles.css";

const messageControls = { table: false } as const;

type Timings = ReadonlyMap<string, ActivityTiming>;

function isRenderedPart(part: EveMessagePart): boolean {
  if (part.type === "text" || part.type === "reasoning") return part.text.trim().length > 0;
  if (part.type === "dynamic-tool") {
    return part.toolName !== "ask_question" || part.toolMetadata?.eve?.inputRequest !== undefined;
  }
  return false;
}

function getPartKey(part: EveMessagePart, index: number): string {
  if (part.type === "dynamic-tool") return part.toolCallId;
  if (part.type === "text" || part.type === "reasoning") {
    return `${part.type}:${part.stepIndex ?? index}`;
  }
  return `${part.type}:${index}`;
}

function MarkdownMessage({ isAnimating, text }: { isAnimating: boolean; text: string }) {
  return (
    <Streamdown
      className="model-response my-1 wrap-anywhere space-y-2 first:mt-0 last:mb-0 [&_li]:py-0 [&_p]:leading-chat"
      controls={messageControls}
      isAnimating={isAnimating}
    >
      {text}
    </Streamdown>
  );
}

type ThinkingActivityProps = {
  readonly isActive: boolean;
  readonly part: Extract<EveMessagePart, { type: "reasoning" }>;
  readonly timing?: ActivityTiming;
};

function ThinkingActivity({ isActive, part, timing }: ThinkingActivityProps) {
  const isThinking = isActive && part.state === "streaming";
  const elapsed = useElapsed(timing, isThinking);
  const label = isThinking ? "Thinking..." : "Thought";

  return (
    <ModelActivity elapsed={elapsed} icon={Brain} isAnimated={isThinking} label={label}>
      <MarkdownMessage isAnimating={isThinking} text={part.text} />
    </ModelActivity>
  );
}

type AssistantPartProps = {
  readonly canAnswer: boolean;
  readonly isActive: boolean;
  readonly message: EveMessage;
  readonly onAnswer: (requestId: string, optionId: string) => void;
  readonly part: EveMessagePart;
  readonly pendingRequestId?: string;
  readonly timings: Timings;
};

function AssistantPart({
  canAnswer,
  isActive,
  message,
  onAnswer,
  part,
  pendingRequestId,
  timings,
}: AssistantPartProps) {
  if (part.type === "text") {
    return (
      <MarkdownMessage isAnimating={isActive && part.state === "streaming"} text={part.text} />
    );
  }
  if (part.type === "reasoning") {
    const key = getReasoningTimingKey(message.metadata?.turnId, part.stepIndex ?? -1);
    return <ThinkingActivity isActive={isActive} part={part} timing={timings.get(key)} />;
  }
  if (part.type === "dynamic-tool") {
    const inputRequest = part.toolMetadata?.eve?.inputRequest;
    if (part.toolName === "ask_question" && inputRequest) {
      return (
        <InputRequest
          disabled={!canAnswer || inputRequest.requestId !== pendingRequestId}
          onSelect={(optionId) => onAnswer(inputRequest.requestId, optionId)}
          request={inputRequest}
          response={part.toolMetadata?.eve?.inputResponse}
        />
      );
    }
    const timing = timings.get(getToolTimingKey(part.toolCallId));
    return <ToolActivity isActive={isActive} part={part} timing={timing} />;
  }
  return null;
}

type SessionMessageProps = {
  readonly canAnswer: boolean;
  readonly createdAt?: number;
  readonly isActive: boolean;
  readonly message: EveMessage;
  readonly onAnswer: (requestId: string, optionId: string) => void;
  readonly pendingRequestId?: string;
  readonly timings: Timings;
};

function SessionMessage({
  canAnswer,
  createdAt,
  isActive,
  message,
  onAnswer,
  pendingRequestId,
  timings,
}: SessionMessageProps) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const text = textParts.map((part) => part.text).join("\n\n");

  if (message.role === "user") {
    if (!text.trim()) return null;
    return (
      <UserMessage
        actions={<MessageActions createdAt={createdAt} text={text} />}
        messageId={message.id}
      >
        {text}
      </UserMessage>
    );
  }

  const parts = message.parts.filter(isRenderedPart);
  if (parts.length === 0) return null;
  const actions = text ? (
    <MessageActions
      aria-hidden={isActive}
      className={isActive ? "invisible" : undefined}
      createdAt={createdAt}
      text={text}
    />
  ) : undefined;

  return (
    <AssistantMessage actions={actions} messageId={message.id}>
      {parts.map((part, index) => (
        <AssistantPart
          canAnswer={canAnswer}
          isActive={isActive}
          key={getPartKey(part, index)}
          message={message}
          onAnswer={onAnswer}
          part={part}
          pendingRequestId={pendingRequestId}
          timings={timings}
        />
      ))}
    </AssistantMessage>
  );
}

export function SessionMessages({ view }: { readonly view: ReturnType<typeof useSession> }) {
  return (
    <>
      {view.messages.map((message) => (
        <SessionMessage
          canAnswer={!view.isGenerating && !view.isStopping}
          createdAt={message.createdAt}
          isActive={view.isGenerating && message.metadata?.status === "streaming"}
          key={message.id}
          message={message}
          onAnswer={view.answerQuestion}
          pendingRequestId={view.pendingInput?.requestId}
          timings={view.timings}
        />
      ))}
      {view.activityLabel && (
        <ThreadMessage>
          <div className="pt-3 pb-8">
            <ModelActivity icon={Brain} isAnimated label={view.activityLabel} />
          </div>
        </ThreadMessage>
      )}
    </>
  );
}
