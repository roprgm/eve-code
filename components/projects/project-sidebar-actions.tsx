import { EllipsisVertical, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import type { SessionStatus } from "@/components/session/use-session";
import { Button } from "@/components/ui/button";
import { MenuContent, MenuItem } from "@/components/ui/menu";

type ProjectSidebarActionsProps = {
  readonly name: string;
  readonly onDelete: () => void;
  readonly onRename: () => void;
  readonly projectId: string;
  readonly status: SessionStatus;
};

export function ProjectSidebarActions({
  name,
  onDelete,
  onRename,
  projectId,
  status,
}: ProjectSidebarActionsProps) {
  const id = `project-actions-${projectId}`;
  const anchor = `--${id}`;

  return (
    <div className="relative mr-0.5 grid size-6 shrink-0 place-items-center">
      {status === "running" && (
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
        style={{ anchorName: anchor }}
        variant="ghost"
      >
        <EllipsisVertical aria-hidden="true" />
      </Button>
      <MenuContent
        className="w-40 [position-area:bottom_span-left] [position-try-fallbacks:flip-block]"
        id={id}
        popover="auto"
        side="bottom"
        style={{ positionAnchor: anchor }}
      >
        <MenuItem onClick={onRename} popoverTarget={id} popoverTargetAction="hide">
          <Pencil aria-hidden="true" />
          Rename
        </MenuItem>
        <MenuItem
          className="text-destructive"
          disabled={status === "running"}
          onClick={onDelete}
          popoverTarget={id}
          popoverTargetAction="hide"
        >
          <Trash2 aria-hidden="true" />
          Delete
        </MenuItem>
      </MenuContent>
    </div>
  );
}
