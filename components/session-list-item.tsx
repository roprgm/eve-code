import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { EllipsisVertical, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { type KeyboardEvent, type SubmitEvent, useEffect, useRef, useState } from "react";
import { href, Link } from "react-router";

import type { SessionStatus } from "@/components/session/use-session";
import { Button } from "@/components/ui/button";
import { getMenuAnchorStyle, MenuContent, MenuItem } from "@/components/ui/menu";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export type SessionSummary = {
  readonly name: string;
  readonly sessionId: string;
  readonly status: SessionStatus;
};

type SessionListActionsProps = {
  readonly name: string;
  readonly onDelete: () => void;
  readonly onRename: () => void;
  readonly sessionId: string;
  readonly status: SessionStatus;
};

function SessionListActions({
  name,
  onDelete,
  onRename,
  sessionId,
  status,
}: SessionListActionsProps) {
  const id = `session-actions-${sessionId}`;
  const isActive = status === "running" || status === "stopping";

  return (
    <div className="relative mr-0.5 grid size-6 shrink-0 place-items-center">
      {isActive && (
        <LoaderCircle
          aria-label={`${name} is working`}
          className="hidden size-4 animate-spin text-muted-foreground md:block md:group-hover:opacity-0 md:group-focus-within:opacity-0"
          role="status"
        />
      )}
      <Button
        aria-label={`More options for ${name}`}
        className="absolute inset-0 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        popoverTarget={id}
        size="icon-sm"
        style={getMenuAnchorStyle(id)}
        variant="ghost"
      >
        <EllipsisVertical aria-hidden="true" />
      </Button>
      <MenuContent
        className="w-40 [position-area:bottom_span-left] [position-try-fallbacks:flip-block]"
        id={id}
        side="bottom"
      >
        <MenuItem onClick={onRename} popoverTarget={id}>
          <Pencil aria-hidden="true" />
          Rename
        </MenuItem>
        <MenuItem
          className="text-destructive"
          disabled={isActive}
          onClick={onDelete}
          popoverTarget={id}
        >
          <Trash2 aria-hidden="true" />
          Delete
        </MenuItem>
      </MenuContent>
    </div>
  );
}

export function SessionListItem({
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

  function submit(event: SubmitEvent<HTMLFormElement>): void {
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
        <SessionListActions
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
