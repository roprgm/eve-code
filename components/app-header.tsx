import { Download, GitFork, PanelLeft, PanelRight, SquarePen, X } from "lucide-react";
import { useOutletContext } from "react-router";

import { PreviewControl } from "@/components/session/preview-control";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import type { Preview } from "@/lib/preview";
import { getWorkspaceUrl } from "@/lib/workspace";

type AppHeaderProps = {
  readonly branch?: string;
  readonly isWorkspaceOpen?: boolean;
  readonly onToggleWorkspace?: () => void;
  readonly preview?: Preview;
  readonly repository?: string;
  readonly title: string;
  readonly workspaceSessionId?: string;
};

type SidebarContext = {
  readonly isSidebarExpanded: boolean;
  readonly openNewSession: () => void;
  readonly toggleSidebar: () => void;
};

function WorkspaceToggleIcon({ isOpen }: { readonly isOpen: boolean }) {
  if (!isOpen) return <PanelRight aria-hidden="true" />;

  return (
    <>
      <X aria-hidden="true" className="md:hidden" />
      <PanelRight aria-hidden="true" className="hidden md:block" />
    </>
  );
}

function WorkspaceToggle({
  isOpen,
  onToggle,
}: {
  readonly isOpen?: boolean;
  readonly onToggle?: () => void;
}) {
  if (!onToggle) return null;
  const label = isOpen ? "Close files" : "Open files";

  return (
    <Button
      aria-controls="workspace-panel"
      aria-expanded={Boolean(isOpen)}
      aria-label={label}
      onClick={onToggle}
      size="icon"
      variant="ghost"
    >
      <WorkspaceToggleIcon isOpen={Boolean(isOpen)} />
    </Button>
  );
}

function CollapsedSidebarActions({
  isExpanded,
  onNewSession,
  onToggle,
}: {
  readonly isExpanded: boolean;
  readonly onNewSession: () => void;
  readonly onToggle: () => void;
}) {
  if (isExpanded) return null;

  return (
    <>
      <Button
        aria-controls="session-sidebar"
        aria-expanded="false"
        aria-label="Expand sessions"
        onClick={onToggle}
        size="icon"
        variant="ghost"
      >
        <PanelLeft aria-hidden="true" />
      </Button>
      <Button aria-label="New session" onClick={onNewSession} size="icon" variant="ghost">
        <SquarePen aria-hidden="true" />
      </Button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
    </>
  );
}

function BranchLabel({ branch }: { readonly branch?: string }) {
  if (!branch) return null;
  return <span className="shrink-0 font-mono text-xs">{branch}</span>;
}

function GitLabel({
  branch,
  repository,
}: {
  readonly branch?: string;
  readonly repository?: string;
}) {
  if (!repository && !branch) return null;

  return (
    <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
      <GitFork aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{repository ?? "Git repository"}</span>
      <BranchLabel branch={branch} />
    </span>
  );
}

function WorkspaceDownloadAction({
  menuId,
  sessionId,
}: {
  readonly menuId: string;
  readonly sessionId?: string;
}) {
  function onDownload(): void {
    if (!sessionId) return;
    window.location.assign(`${getWorkspaceUrl(sessionId)}/download`);
  }

  return (
    <MenuItem className="text-sm" disabled={!sessionId} onClick={onDownload} popoverTarget={menuId}>
      <Download aria-hidden="true" className="size-3.5" />
      Download
    </MenuItem>
  );
}

function HeaderPreview({
  preview,
  sessionId,
}: {
  readonly preview?: Preview;
  readonly sessionId?: string;
}) {
  if (!preview) return null;
  const menuId = `sandbox-info-${preview.sandboxId}`;

  return (
    <PreviewControl
      actions={<WorkspaceDownloadAction menuId={menuId} sessionId={sessionId} />}
      menuId={menuId}
      preview={preview}
    />
  );
}

export function AppHeader({
  branch,
  isWorkspaceOpen,
  onToggleWorkspace,
  preview,
  repository,
  title,
  workspaceSessionId,
}: AppHeaderProps) {
  const { isSidebarExpanded, openNewSession, toggleSidebar } = useOutletContext<SidebarContext>();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <CollapsedSidebarActions
        isExpanded={isSidebarExpanded}
        onNewSession={openNewSession}
        onToggle={toggleSidebar}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="truncate font-medium">{title}</h1>
        <GitLabel branch={branch} repository={repository} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <HeaderPreview preview={preview} sessionId={workspaceSessionId} />
        <WorkspaceToggle isOpen={isWorkspaceOpen} onToggle={onToggleWorkspace} />
      </div>
    </header>
  );
}
