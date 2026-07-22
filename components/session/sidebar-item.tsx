import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { href, Link } from "react-router";
import { SessionSidebarActions } from "@/components/session/sidebar-actions";
import type { SessionStatus } from "@/components/session/use-session";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export type SessionSummary = {
  readonly name: string;
  readonly sessionId: string;
  readonly status: SessionStatus;
};

export function SessionSidebarItem({
  isSelected,
  onDelete,
  onNavigate,
  session,
}: {
  readonly isSelected: boolean;
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
        "group mb-0.5 flex h-9 min-w-0 items-center rounded-md transition-colors hover:bg-sidebar-hover focus-within:bg-sidebar-hover md:h-7",
        isSelected &&
          "bg-sidebar-selected hover:bg-sidebar-selected focus-within:bg-sidebar-selected",
      )}
    >
      {isEditing && (
        <form className="min-w-0 flex-1 px-2" onSubmit={submit}>
          <input
            aria-invalid={renameSession.isError}
            aria-label={`Rename ${session.name}`}
            className="w-full bg-transparent outline-none aria-invalid:text-destructive"
            defaultValue={session.name}
            disabled={renameSession.isPending}
            maxLength={100}
            onBlur={saveName}
            onKeyDown={cancel}
            ref={inputRef}
          />
        </form>
      )}
      {!isEditing && (
        <Link
          aria-current={isSelected}
          className="flex h-full min-w-0 flex-1 items-center px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
          onClick={onNavigate}
          to={href("/s/:sessionId", { sessionId: session.sessionId })}
        >
          <span className="block truncate">{session.name}</span>
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
        />
      )}
    </div>
  );
}
