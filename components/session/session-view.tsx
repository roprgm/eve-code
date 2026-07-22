import { Activity, lazy, type ReactNode, Suspense, useCallback, useState } from "react";

import { CommandLogsProvider } from "@/components/session/command-logs";
import { Composer } from "@/components/session/composer";
import { Conversation } from "@/components/session/conversation";
import { InputRequest } from "@/components/session/input-request";
import { PageHeader } from "@/components/session/page-header";
import { type StoredSession, useSession } from "@/components/session/use-session";
import { Alert } from "@/components/ui/alert";
import { MessageScroller, MessageScrollerItem } from "@/components/ui/message-scroller";
import {
  type WorkspaceFileRequest,
  WorkspaceNavigationProvider,
} from "@/components/workspace/workspace-navigation";
import type { StoredEveEvent } from "@/lib/eve-events";
import { getPreview } from "@/lib/preview";

const WorkspacePanel = lazy(() => import("@/components/workspace/workspace-panel"));

type SessionViewProps = {
  readonly checkpointEvents: readonly StoredEveEvent[];
  readonly session?: StoredSession;
  readonly sessionId: string;
  readonly title: string;
};

export function SessionView({ checkpointEvents, session, sessionId, title }: SessionViewProps) {
  const [workspaceState, setWorkspaceState] = useState<"closed" | "open" | "unopened">("unopened");
  const [workspaceFile, setWorkspaceFile] = useState<WorkspaceFileRequest>({ id: 0, path: "" });
  const view = useSession({
    checkpointEvents,
    session,
    sessionId,
  });
  const preview = getPreview(view.messages, session?.eveSessionId);
  const hasNotices = Boolean(view.pendingInput || view.error);
  const isWorkspaceOpen = workspaceState === "open";
  let conversationClass = "flex min-w-0 flex-1 flex-col";
  if (isWorkspaceOpen) {
    conversationClass = "hidden min-w-0 flex-1 flex-col md:flex md:w-1/2 md:flex-none";
  }
  let workspace: ReactNode;
  if (workspaceState !== "unopened") {
    workspace = (
      <Activity mode={isWorkspaceOpen ? "visible" : "hidden"}>
        <Suspense
          fallback={
            <aside
              aria-label="Workspace files"
              className="flex min-h-0 w-full items-center justify-center text-sm text-muted-foreground md:w-1/2 md:border-l"
              id="workspace-panel"
            >
              Loading files…
            </aside>
          }
        >
          <WorkspacePanel
            requestedFile={workspaceFile}
            revision={session?.streamIndex ?? 0}
            sessionId={session?.eveSessionId ?? ""}
          />
        </Suspense>
      </Activity>
    );
  }

  function onToggleWorkspace(): void {
    setWorkspaceState((state) => (state === "open" ? "closed" : "open"));
  }

  const openWorkspaceFile = useCallback((path: string): void => {
    setWorkspaceState("open");
    setWorkspaceFile((request) => ({ id: request.id + 1, path }));
  }, []);

  return (
    <WorkspaceNavigationProvider openFile={openWorkspaceFile}>
      <CommandLogsProvider sessionId={session?.eveSessionId ?? ""}>
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <PageHeader
            isWorkspaceOpen={isWorkspaceOpen}
            onToggleWorkspace={onToggleWorkspace}
            preview={preview}
            title={title}
          />
          <div className="flex min-h-0 flex-1">
            <section className={conversationClass}>
              <MessageScroller>
                <Conversation view={view} />
                {hasNotices && (
                  <MessageScrollerItem>
                    {view.pendingInput && (
                      <InputRequest
                        disabled={view.isGenerating || view.isStopping}
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
            </section>
            {workspace}
          </div>
        </main>
      </CommandLogsProvider>
    </WorkspaceNavigationProvider>
  );
}
