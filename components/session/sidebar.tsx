import { useConvexPaginatedQuery } from "@convex-dev/react-query";
import { AlignLeft, PanelLeft, SquarePen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { href, useNavigate } from "react-router";

import { DeleteSessionDialog } from "@/components/session/delete-dialog";
import { SessionSidebarItem, type SessionSummary } from "@/components/session/sidebar-item";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

type SessionSidebarProps = {
  readonly isCollapsed: boolean;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onNewSession: () => void;
  readonly onToggle: () => void;
  readonly selectedSessionId: string | null;
};

export function SessionSidebar({
  isCollapsed,
  isOpen,
  onClose,
  onNewSession,
  onToggle,
  selectedSessionId,
}: SessionSidebarProps) {
  const {
    loadMore,
    results: sessions,
    status,
  } = useConvexPaginatedQuery(api.sessions.list, {}, { initialNumItems: 50 });
  const navigate = useNavigate();
  const now = useNow();
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary>();

  function openDelete(session: SessionSummary): void {
    setDeleteTarget(session);
    document.querySelector<HTMLDialogElement>("#delete-session-dialog")?.showModal();
  }

  function sessionDeleted(sessionId: string): void {
    if (selectedSessionId !== sessionId) return;
    onClose();
    void navigate(href("/"));
  }

  return (
    <>
      <button
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-40 bg-black/50 opacity-0 transition-opacity md:hidden",
          isOpen && "pointer-events-auto opacity-100",
        )}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <aside
        id="session-sidebar"
        inert={isCollapsed}
        className={cn(
          "invisible fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] -translate-x-full flex-col overflow-hidden border-r bg-sidebar p-3 text-sidebar-foreground shadow-2xl transition-[width,transform,padding] md:visible md:static md:z-auto md:w-72 md:translate-x-0 md:p-2 md:shadow-none",
          isOpen && "visible translate-x-0",
          isCollapsed && "md:w-0 md:border-r-0 md:p-0",
        )}
      >
        <div className="flex h-10 shrink-0 items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AlignLeft aria-hidden="true" className="text-muted-foreground" />
            <span className="truncate">Eve Code</span>
          </div>
          <Button
            aria-label="Close sessions"
            className="text-muted-foreground md:hidden"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
          <Button
            aria-controls="session-sidebar"
            aria-expanded="true"
            aria-label="Collapse sessions"
            className="hidden text-muted-foreground md:inline-flex"
            onClick={onToggle}
            size="icon"
            variant="ghost"
          >
            <PanelLeft aria-hidden="true" />
          </Button>
        </div>
        <button
          className="mt-4 flex h-9 w-full shrink-0 items-center gap-2.5 rounded-md px-2 text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:bg-sidebar-hover md:h-7"
          onClick={onNewSession}
          type="button"
        >
          <SquarePen aria-hidden="true" className="text-muted-foreground" />
          New session
        </button>
        <nav
          aria-label="Sessions"
          className="app-scrollbar scroll-fade -mr-3 mt-4 min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable] md:-mr-2 md:pr-2"
        >
          <p className="px-2 pb-1.5 text-sm font-medium text-muted-foreground">Sessions</p>
          {sessions.map((session) => (
            <SessionSidebarItem
              isSelected={selectedSessionId === session.sessionId}
              key={session.sessionId}
              now={now}
              onDelete={openDelete}
              onNavigate={onClose}
              session={session}
            />
          ))}
          {status === "CanLoadMore" && (
            <Button className="mt-3 w-full" onClick={() => loadMore(50)} size="sm" variant="ghost">
              Load older sessions
            </Button>
          )}
        </nav>
      </aside>
      <DeleteSessionDialog
        onClose={() => setDeleteTarget(undefined)}
        onDeleted={sessionDeleted}
        target={deleteTarget}
      />
    </>
  );
}
