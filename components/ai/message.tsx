import type { ReactNode } from "react";

import { ThreadMessage } from "@/components/ai/thread";

type MessageProps = {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly messageId: string;
};

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
  const className = actions
    ? "group/message relative pt-3 pb-12"
    : "group/message relative pt-3 pb-5";

  return (
    <ThreadMessage messageId={messageId}>
      <article aria-label="eve-code" className={className}>
        <div>{children}</div>
        {actions && <div className="absolute bottom-5 left-0">{actions}</div>}
      </article>
    </ThreadMessage>
  );
}
