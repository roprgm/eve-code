import { useConvexMutation } from "@convex-dev/react-query";
import { href, useNavigate } from "react-router";

import { AppHeader } from "@/components/app-header";
import { SessionStart } from "@/components/session/session-start";
import { api } from "@/convex/_generated/api";
import type { GitRepository } from "@/lib/github";
import { createPublicId } from "@/lib/identity";
import { sendTurn } from "@/lib/session-runtime";

export function HomePage() {
  const createSession = useConvexMutation(api.sessions.create);
  const navigate = useNavigate();

  function openSession(sessionId: string): void {
    void navigate(href("/s/:sessionId", { sessionId }));
  }

  function startSession(message: string, clientContext?: string): void {
    const sessionId = createPublicId();
    sendTurn(
      sessionId,
      { clientContext, message },
      {
        beforeSend: createSession({ message, sessionId }),
      },
    );
    openSession(sessionId);
  }

  function importRepository(repository: GitRepository): void {
    startSession(
      `Start from ${repository.name}`,
      `Use clone_repository to clone ${repository.name} into the current directory. Report the result and ask what I want to work on.`,
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <AppHeader title="New session" />
      <SessionStart onImport={importRepository} onStart={startSession} />
    </main>
  );
}
