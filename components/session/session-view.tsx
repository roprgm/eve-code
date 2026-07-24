import { Activity, lazy, Suspense, useCallback, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { Composer } from "@/components/chat/composer";
import { Thread, ThreadMessage } from "@/components/chat/thread";
import { CommandLogsProvider } from "@/components/session/command-logs";
import { SessionMessages } from "@/components/session/messages";
import { type StoredSession, useSession } from "@/components/session/use-session";
import { Alert } from "@/components/ui/alert";
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

function getConversationClass(isWorkspaceOpen: boolean): string {
  if (isWorkspaceOpen) {
    return "hidden min-w-0 flex-1 flex-col md:flex md:w-1/2 md:flex-none";
  }
  return "flex min-w-0 flex-1 flex-col";
}

function SessionWorkspace({
  isOpen,
  isOpened,
  requestedFile,
  revision,
  sessionId,
}: {
  readonly isOpen: boolean;
  readonly isOpened: boolean;
  readonly requestedFile: WorkspaceFileRequest;
  readonly revision: number;
  readonly sessionId: string;
}) {
  if (!isOpened) return null;

  const mode = isOpen ? "visible" : "hidden";

  return (
    <Activity mode={mode}>
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
        <WorkspacePanel requestedFile={requestedFile} revision={revision} sessionId={sessionId} />
      </Suspense>
    </Activity>
  );
}

export function SessionView({ checkpointEvents, session, sessionId, title }: SessionViewProps) {
  const [workspaceState, setWorkspaceState] = useState<"closed" | "open" | "unopened">("unopened");
  const [workspaceFile, setWorkspaceFile] = useState<WorkspaceFileRequest>({ id: 0, path: "" });
  const view = useSession({
    checkpointEvents,
    session,
    sessionId,
  });
  const preview = getPreview(view.messages, session?.eveSessionId);
  const hasNotices = Boolean(view.error);
  const isWorkspaceOpen = workspaceState === "open";
  const toggleWorkspace = session?.eveSessionId ? onToggleWorkspace : undefined;
  const conversationClass = getConversationClass(isWorkspaceOpen);

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
          <AppHeader
            branch={session?.branch}
            isWorkspaceOpen={isWorkspaceOpen}
            onToggleWorkspace={toggleWorkspace}
            preview={preview}
            repository={session?.repository}
            title={title}
            workspaceSessionId={session?.eveSessionId}
          />
          <div className="flex min-h-0 flex-1">
            <section className={conversationClass}>
              <Thread>
                <SessionMessages view={view} />
                {hasNotices && (
                  <ThreadMessage>
                    {view.error && (
                      <Alert className="my-4 px-4 py-2" variant="destructive">
                        {view.error}
                      </Alert>
                    )}
                  </ThreadMessage>
                )}
              </Thread>
              <div className="shrink-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
                <Composer
                  disabled={view.disabled}
                  isGenerating={view.isGenerating}
                  onSend={view.sendMessage}
                  onStop={view.stop}
                />
              </div>
            </section>
            <SessionWorkspace
              isOpen={isWorkspaceOpen}
              isOpened={workspaceState !== "unopened"}
              requestedFile={workspaceFile}
              revision={session?.streamIndex ?? 0}
              sessionId={session?.eveSessionId ?? ""}
            />
          </div>
        </main>
      </CommandLogsProvider>
    </WorkspaceNavigationProvider>
  );
}
