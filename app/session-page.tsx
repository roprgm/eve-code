import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { SessionView } from "@/components/session/session-view";
import { api } from "@/convex/_generated/api";
import { isPublicId } from "@/lib/identity";
import { useSessionRuntime } from "@/lib/session-runtime";
import { NotFoundPage } from "./not-found";

function SessionLoading() {
  return (
    <main aria-busy="true" className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="h-12 shrink-0 border-b" />
      <div aria-label="Loading session" className="min-h-0 flex-1" role="status" />
    </main>
  );
}

function Session({ sessionId }: { readonly sessionId: string }) {
  const { data: session } = useQuery(convexQuery(api.sessions.get, { sessionId }));
  const runtime = useSessionRuntime(sessionId);

  if (session === undefined && !runtime) return <SessionLoading />;
  if (session === null && !runtime) return <NotFoundPage title="Session not found" />;

  return (
    <SessionView
      checkpointEvents={session?.events ?? []}
      key={sessionId}
      session={session ?? undefined}
      sessionId={sessionId}
      title={session?.name ?? "New session"}
    />
  );
}

export function SessionPage() {
  const { sessionId } = useParams();
  if (!isPublicId(sessionId)) return <NotFoundPage />;

  return <Session sessionId={sessionId} />;
}
