import { EllipsisVertical, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import type { SessionStatus } from "@/components/session/use-session";
import { Button } from "@/components/ui/button";
import { getMenuAnchorStyle, MenuContent, MenuItem } from "@/components/ui/menu";

type SessionSidebarActionsProps = {
  readonly name: string;
  readonly onDelete: () => void;
  readonly onRename: () => void;
  readonly sessionId: string;
  readonly status: SessionStatus;
};

export function SessionSidebarActions({
  name,
  onDelete,
  onRename,
  sessionId,
  status,
}: SessionSidebarActionsProps) {
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
