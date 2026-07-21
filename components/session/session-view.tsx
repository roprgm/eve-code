import { Composer } from "@/components/session/composer";
import { Conversation } from "@/components/session/conversation";
import { InputRequest } from "@/components/session/input-request";
import { PageHeader } from "@/components/session/page-header";
import { type StoredSession, useSession } from "@/components/session/use-session";
import { Alert } from "@/components/ui/alert";
import { MessageScroller, MessageScrollerItem } from "@/components/ui/message-scroller";
import { getPreview, type StoredEveEvent } from "@/lib/eve-events";

type SessionViewProps = {
  readonly checkpointEvents: readonly StoredEveEvent[];
  readonly session?: StoredSession;
  readonly sessionId: string;
  readonly title: string;
};

export function SessionView({ checkpointEvents, session, sessionId, title }: SessionViewProps) {
  const view = useSession({
    checkpointEvents,
    session,
    sessionId,
  });
  const preview = getPreview(view.messages, session?.eveSessionId);
  const hasNotices = Boolean(view.pendingInput || view.error);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <PageHeader preview={preview} title={title} />
      <MessageScroller>
        <Conversation view={view} />
        {hasNotices && (
          <MessageScrollerItem>
            {view.pendingInput && (
              <InputRequest
                disabled={view.isGenerating}
                onSelect={view.answerQuestion}
                request={view.pendingInput}
              />
            )}
            {view.error && (
              <Alert className="my-4 px-4 py-2" variant="destructive">
                {view.error}
              </Alert>
            )}
          </MessageScrollerItem>
        )}
      </MessageScroller>
      <Composer
        disabled={view.disabled}
        isGenerating={view.isGenerating}
        onSend={view.sendMessage}
        onStop={view.stop}
      />
    </main>
  );
}
