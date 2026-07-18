import { useConvexMutation } from "@convex-dev/react-query";
import { href, useNavigate } from "react-router";

import { Composer } from "@/components/session/composer";
import { PageHeader } from "@/components/session/page-header";
import { api } from "@/convex/_generated/api";
import { createPublicId } from "@/lib/identity";
import { sendTurn } from "@/lib/session-runtime";

export function HomePage() {
  const createProject = useConvexMutation(api.projects.create);
  const navigate = useNavigate();

  function sendFirstMessage(message: string): void {
    const projectId = createPublicId();
    const sessionId = createPublicId();
    sendTurn(
      sessionId,
      { message },
      { beforeSend: createProject({ message, projectId, sessionId }) },
    );
    void navigate(href("/p/:projectId", { projectId }), { state: { sessionId } });
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <PageHeader title="New project" />
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-medium tracking-tight">What should we build?</h2>
      </div>
      <Composer onSend={sendFirstMessage} />
    </main>
  );
}
