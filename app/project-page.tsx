import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router";

import { SessionView } from "@/components/session/session-view";
import { api } from "@/convex/_generated/api";
import { isPublicId } from "@/lib/identity";
import { useSessionRuntime } from "@/lib/session-runtime";
import { NotFoundPage } from "./not-found";

function ProjectLoading() {
  return (
    <main aria-busy="true" className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="h-12 shrink-0 border-b" />
      <div aria-label="Loading project" className="min-h-0 flex-1" role="status" />
    </main>
  );
}

function readOptimisticSessionId(state: unknown): string | undefined {
  if (!state || typeof state !== "object" || !("sessionId" in state)) return;
  if (isPublicId(state.sessionId)) return state.sessionId;
}

function ProjectSession({
  detail,
  sessionId,
}: {
  readonly detail: ReturnType<typeof useProjectDetail>;
  readonly sessionId: string;
}) {
  const runtime = useSessionRuntime(sessionId);

  if (detail === undefined && !runtime) return <ProjectLoading />;
  if (detail === null && !runtime) return <NotFoundPage title="Project not found" />;

  return (
    <SessionView
      checkpointEvents={detail?.events ?? []}
      session={detail?.session}
      sessionId={sessionId}
      title={detail?.name ?? "New project"}
    />
  );
}

function useProjectDetail(projectId: string) {
  const { data } = useQuery(convexQuery(api.projects.get, { projectId }));
  return data;
}

function Project({ projectId }: { readonly projectId: string }) {
  const detail = useProjectDetail(projectId);
  const location = useLocation();
  const sessionId = detail?.session.sessionId ?? readOptimisticSessionId(location.state);

  if (!sessionId) {
    if (detail === undefined) return <ProjectLoading />;
    return <NotFoundPage title="Project not found" />;
  }

  return <ProjectSession detail={detail} sessionId={sessionId} />;
}

export function ProjectPage() {
  const { projectId } = useParams();
  if (!projectId) return <NotFoundPage />;

  return <Project projectId={projectId} />;
}
