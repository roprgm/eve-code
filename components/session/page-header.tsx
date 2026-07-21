import { PanelLeft, SquarePen } from "lucide-react";
import { useOutletContext } from "react-router";

import { SandboxControl } from "@/components/session/sandbox-control";
import { Button } from "@/components/ui/button";
import type { Preview } from "@/lib/eve-events";

type PageHeaderProps = {
  readonly preview?: Preview;
  readonly title: string;
};

type SidebarContext = {
  readonly isSidebarExpanded: boolean;
  readonly openNewProject: () => void;
  readonly toggleSidebar: () => void;
};

export function PageHeader({ preview, title }: PageHeaderProps) {
  const { isSidebarExpanded, openNewProject, toggleSidebar } = useOutletContext<SidebarContext>();
  const sandboxControl = preview ? <SandboxControl preview={preview} /> : null;
  const sidebarActions = isSidebarExpanded ? null : (
    <>
      <Button
        aria-controls="project-sidebar"
        aria-expanded="false"
        aria-label="Expand projects"
        className="size-8 [&_svg]:size-4"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeft aria-hidden="true" />
      </Button>
      <Button
        aria-label="New project"
        className="size-8 [&_svg]:size-4"
        onClick={openNewProject}
        size="icon-sm"
        variant="ghost"
      >
        <SquarePen aria-hidden="true" />
      </Button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
    </>
  );

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      {sidebarActions}
      <h1 className="truncate font-medium">{title}</h1>
      {sandboxControl}
    </header>
  );
}
