import type { EveMessage, EveMessagePart } from "eve/client";
import { Brain } from "lucide-react";
import { lazy, Suspense } from "react";

import { ModelActivity } from "@/components/session/model-activity";
import { ToolActivity } from "@/components/session/tool-activity";
import { useElapsed } from "@/components/session/use-elapsed";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageScrollerItem } from "@/components/ui/message-scroller";
import { type ActivityTiming, getReasoningTimingKey, getToolTimingKey } from "@/lib/eve-events";

const MarkdownMessage = lazy(() => import("@/components/session/markdown-message"));

type Timings = ReadonlyMap<string, ActivityTiming>;

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function isRenderedPart(part: EveMessagePart): boolean {
  if (part.type === "dynamic-tool") return part.toolName !== "ask_question";
  if (part.type === "text" || part.type === "reasoning") return part.text.trim().length > 0;
  return false;
}

function getPartKey(part: EveMessagePart, index: number): string {
  if (part.type === "dynamic-tool") return part.toolCallId;
  if (part.type === "text" || part.type === "reasoning") {
    return `${part.type}:${part.stepIndex ?? index}`;
  }
  return `${part.type}:${index}`;
}

function MessageActions({
  createdAt,
  text,
}: {
  readonly createdAt?: number;
  readonly text: string;
}) {
  return (
    <div className="mt-1 flex h-6 items-center gap-1 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100">
      {createdAt !== undefined && (
        <time className="text-sm" dateTime={new Date(createdAt).toISOString()}>
          {timeFormatter.format(createdAt)}
        </time>
      )}
      <CopyButton value={text} />
    </div>
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
      <Suspense fallback={part.text}>
        <MarkdownMessage isAnimating={isThinking} text={part.text} />
      </Suspense>
    </ModelActivity>
  );
}

type AssistantPartProps = {
  readonly isActive: boolean;
  readonly message: EveMessage;
  readonly part: EveMessagePart;
  readonly timings: Timings;
};

function AssistantPart({ isActive, message, part, timings }: AssistantPartProps) {
  if (part.type === "text") {
    return (
      <Suspense fallback={part.text}>
        <MarkdownMessage isAnimating={isActive && part.state === "streaming"} text={part.text} />
      </Suspense>
    );
  }
  if (part.type === "reasoning") {
    const key = getReasoningTimingKey(message.metadata?.turnId, part.stepIndex ?? -1);
    return <ThinkingActivity isActive={isActive} part={part} timing={timings.get(key)} />;
  }
  if (part.type === "dynamic-tool") {
    const timing = timings.get(getToolTimingKey(part.toolCallId));
    return <ToolActivity isActive={isActive} part={part} timing={timing} />;
  }
  return null;
}

type MessageProps = {
  readonly createdAt?: number;
  readonly isActive: boolean;
  readonly message: EveMessage;
  readonly timings: Timings;
};

export function Message({ createdAt, isActive, message, timings }: MessageProps) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const text = textParts.map((part) => part.text).join("\n\n");

  if (message.role === "user") {
    if (!text.trim()) return null;
    return (
      <MessageScrollerItem messageId={message.id}>
        <article aria-label="You" className="group/message flex flex-col items-end py-3">
          <p className="max-w-[85%] wrap-anywhere whitespace-pre-wrap rounded-xl bg-muted px-4 py-2 leading-chat sm:max-w-[75%]">
            {text}
          </p>
          <MessageActions createdAt={createdAt} text={text} />
        </article>
      </MessageScrollerItem>
    );
  }

  const parts = message.parts.filter(isRenderedPart);
  if (parts.length === 0) return null;
  const showActions = Boolean(text) && !isActive;

  return (
    <MessageScrollerItem messageId={message.id}>
      <article aria-label="eve-code" className="group/message pt-3 pb-5">
        <div className="space-y-1">
          {parts.map((part, index) => (
            <AssistantPart
              isActive={isActive}
              key={getPartKey(part, index)}
              message={message}
              part={part}
              timings={timings}
            />
          ))}
        </div>
        {showActions && <MessageActions createdAt={createdAt} text={text} />}
      </article>
    </MessageScrollerItem>
  );
}
