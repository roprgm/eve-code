import { Brain } from "lucide-react";

import { Message } from "@/components/session/message";
import { ModelActivity } from "@/components/session/model-activity";
import type { useSession } from "@/components/session/use-session";
import { MessageScrollerItem } from "@/components/ui/message-scroller";

type ConversationProps = {
  readonly view: ReturnType<typeof useSession>;
};

export function Conversation({ view }: ConversationProps) {
  return (
    <>
      {view.messages.map((message) => (
        <Message
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
        <MessageScrollerItem>
          <div className="pt-3 pb-8">
            <ModelActivity icon={Brain} isAnimated label={view.activityLabel} />
          </div>
        </MessageScrollerItem>
      )}
    </>
  );
}
