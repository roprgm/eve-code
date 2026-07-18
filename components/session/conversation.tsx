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
          createdAt={message.createdAt}
          isActive={view.isGenerating && message.metadata?.status === "streaming"}
          key={message.id}
          message={message}
        />
      ))}
      {view.activityLabel && (
        <MessageScrollerItem>
          <ModelActivity label={view.activityLabel} />
        </MessageScrollerItem>
      )}
    </>
  );
}
