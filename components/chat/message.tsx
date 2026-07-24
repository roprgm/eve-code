import { Check, Copy } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";

import { ThreadMessage } from "@/components/chat/thread";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessageProps = {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly messageId: string;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

type MessageActionsProps = ComponentProps<"div"> & {
  readonly createdAt?: number;
  readonly text: string;
};

export function MessageActions({ className, createdAt, text, ...props }: MessageActionsProps) {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1_200);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div
      className={cn(
        "flex h-6 items-center gap-1 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100",
        className,
      )}
      {...props}
    >
      {createdAt !== undefined && (
        <time className="text-sm" dateTime={new Date(createdAt).toISOString()}>
          {timeFormatter.format(createdAt)}
        </time>
      )}
      <Button
        aria-label={isCopied ? "Copied" : "Copy message"}
        className="text-muted-foreground"
        onClick={copy}
        size="icon-sm"
        title="Copy"
        variant="ghost"
      >
        {isCopied && <Check aria-hidden="true" className="fade" />}
        {!isCopied && <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}

export function UserMessage({ actions, children, messageId }: MessageProps) {
  return (
    <ThreadMessage messageId={messageId}>
      <article
        aria-label="You"
        className="group/message relative flex flex-col items-end pt-3 pb-10"
      >
        <div className="max-w-[85%] wrap-anywhere whitespace-pre-wrap rounded-xl bg-muted px-4 py-2 leading-chat sm:max-w-[75%]">
          {children}
        </div>
        {actions && <div className="absolute right-0 bottom-3">{actions}</div>}
      </article>
    </ThreadMessage>
  );
}

export function AssistantMessage({ actions, children, messageId }: MessageProps) {
  return (
    <ThreadMessage messageId={messageId}>
      <article aria-label="Assistant" className="group/message relative pt-3 pb-12">
        <div>{children}</div>
        {actions && <div className="absolute bottom-5 left-0">{actions}</div>}
      </article>
    </ThreadMessage>
  );
}
