import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { GitFork } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { href, Link } from "react-router";
import { SessionSidebarActions } from "@/components/session/sidebar-actions";
import type { SessionStatus } from "@/components/session/use-session";
import { api } from "@/convex/_generated/api";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export type SessionSummary = {
  readonly name: string;
  readonly repository?: string;
  readonly sessionId: string;
  readonly status: SessionStatus;
  readonly updatedAt: number;
};

function RepositoryRow({ repository }: { readonly repository?: string }) {
  if (!repository) return <span className="h-4" />;
  return (
    <span className="flex items-center gap-1.5 pr-7 text-sm text-muted-foreground">
      <GitFork aria-hidden="true" className="size-3 shrink-0" />
      <span className="truncate">{repository}</span>
    </span>
  );
}

function StatusRow({ status }: { readonly status: SessionStatus }) {
  const isActive = status === "running" || status === "stopping";
  const activity = isActive ? "In progress" : "Ready";
  return (
    <span className="truncate font-mono text-xs text-muted-foreground/75">
      <span aria-hidden="true">{"> "}</span>
      {activity}
    </span>
  );
}

export function SessionSidebarItem({
  isSelected,
  now,
  onDelete,
  onNavigate,
  session,
}: {
  readonly isSelected: boolean;
  readonly now: number;
  readonly onDelete: (session: SessionSummary) => void;
  readonly onNavigate: () => void;
  readonly session: SessionSummary;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setEditing] = useState(false);
  const renameSession = useMutation({
    mutationFn: useConvexMutation(api.sessions.rename),
    onSuccess: () => setEditing(false),
  });

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  function saveName(): void {
    const name = inputRef.current?.value.trim();
    if (!name || name === session.name) {
      setEditing(false);
      return;
    }

    renameSession.mutate({ name, sessionId: session.sessionId });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    inputRef.current?.blur();
  }

  function cancel(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Escape") return;
    event.currentTarget.value = session.name;
    event.currentTarget.blur();
  }

  return (
    <div
      className={cn(
        "group relative mb-1.5 h-18 rounded-md border border-border/40 bg-muted transition-colors hover:bg-accent focus-within:bg-accent",
        isSelected &&
          "border-border bg-sidebar-selected hover:bg-sidebar-selected focus-within:bg-sidebar-selected",
      )}
    >
      {isEditing && (
        <div className="flex h-full min-w-0 flex-col justify-center gap-0.5 px-2.5">
          <RepositoryRow repository={session.repository} />
          <form onSubmit={submit}>
            <input
              aria-invalid={renameSession.isError}
              aria-label={`Rename ${session.name}`}
              className="w-full bg-transparent font-medium leading-5 outline-none aria-invalid:text-destructive"
              defaultValue={session.name}
              disabled={renameSession.isPending}
              maxLength={100}
              onBlur={saveName}
              onKeyDown={cancel}
              ref={inputRef}
            />
          </form>
          <StatusRow status={session.status} />
        </div>
      )}
      {!isEditing && (
        <Link
          aria-current={isSelected}
          className="flex h-full min-w-0 flex-col justify-center gap-0.5 rounded-[inherit] px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
          onClick={onNavigate}
          to={href("/s/:sessionId", { sessionId: session.sessionId })}
        >
          <RepositoryRow repository={session.repository} />
          <span className="truncate font-medium leading-5">{session.name}</span>
          <StatusRow status={session.status} />
        </Link>
      )}
      {!isEditing && (
        <SessionSidebarActions
          name={session.name}
          onDelete={() => onDelete(session)}
          onRename={() => {
            renameSession.reset();
            setEditing(true);
          }}
          sessionId={session.sessionId}
          status={session.status}
          time={formatRelativeTime(session.updatedAt, now)}
        />
      )}
    </div>
  );
}
