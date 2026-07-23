import { PanelLeft, PanelRight, SquarePen, X } from "lucide-react";
import { useOutletContext } from "react-router";

import { SandboxControl } from "@/components/session/sandbox-control";
import { Button } from "@/components/ui/button";
import type { Preview } from "@/lib/preview";

type PageHeaderProps = {
  readonly isWorkspaceOpen?: boolean;
  readonly onToggleWorkspace?: () => void;
  readonly preview?: Preview;
  readonly title: string;
  readonly workspaceSessionId?: string;
};

type SidebarContext = {
  readonly isSidebarExpanded: boolean;
  readonly openNewSession: () => void;
  readonly toggleSidebar: () => void;
};

function WorkspaceToggle({
  isOpen,
  onToggle,
}: {
  readonly isOpen?: boolean;
  readonly onToggle?: () => void;
}) {
  if (!onToggle) return null;
  const label = isOpen ? "Close files" : "Open files";
  let icon = <PanelRight aria-hidden="true" />;
  if (isOpen) {
    icon = (
      <>
        <X aria-hidden="true" className="md:hidden" />
        <PanelRight aria-hidden="true" className="hidden md:block" />
      </>
    );
  }
  return (
    <Button
      aria-controls="workspace-panel"
      aria-expanded={Boolean(isOpen)}
      aria-label={label}
      onClick={onToggle}
      size="icon"
      variant="ghost"
    >
      {icon}
    </Button>
  );
}

export function PageHeader({
  isWorkspaceOpen,
  onToggleWorkspace,
  preview,
  title,
  workspaceSessionId,
}: PageHeaderProps) {
  const { isSidebarExpanded, openNewSession, toggleSidebar } = useOutletContext<SidebarContext>();
  const sandboxControl = preview ? (
    <SandboxControl preview={preview} sessionId={workspaceSessionId} />
  ) : null;
  const sidebarActions = isSidebarExpanded ? null : (
    <>
      <Button
        aria-controls="session-sidebar"
        aria-expanded="false"
        aria-label="Expand sessions"
        onClick={toggleSidebar}
        size="icon"
        variant="ghost"
      >
        <PanelLeft aria-hidden="true" />
      </Button>
      <Button aria-label="New session" onClick={openNewSession} size="icon" variant="ghost">
        <SquarePen aria-hidden="true" />
      </Button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
    </>
  );

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      {sidebarActions}
      <h1 className="truncate font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {sandboxControl}
        <WorkspaceToggle isOpen={isWorkspaceOpen} onToggle={onToggleWorkspace} />
      </div>
    </header>
  );
}
