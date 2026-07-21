import { useConvexPaginatedQuery } from "@convex-dev/react-query";
import { AlignLeft, PanelLeft, SquarePen, X } from "lucide-react";
import { useState } from "react";
import { href, useNavigate } from "react-router";

import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import {
  ProjectSidebarItem,
  type ProjectSummary,
} from "@/components/projects/project-sidebar-item";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type ProjectSidebarProps = {
  readonly isCollapsed: boolean;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onNewProject: () => void;
  readonly onToggle: () => void;
  readonly selectedProjectId: string | null;
};

export function ProjectSidebar({
  isCollapsed,
  isOpen,
  onClose,
  onNewProject,
  onToggle,
  selectedProjectId,
}: ProjectSidebarProps) {
  const {
    loadMore,
    results: projects,
    status,
  } = useConvexPaginatedQuery(api.projects.list, {}, { initialNumItems: 50 });
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary>();

  function openDelete(project: ProjectSummary): void {
    setDeleteTarget(project);
    document.querySelector<HTMLDialogElement>("#delete-project-dialog")?.showModal();
  }

  function projectDeleted(projectId: string): void {
    if (selectedProjectId !== projectId) return;
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
        id="project-sidebar"
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
            aria-label="Close projects"
            className="size-8 text-muted-foreground md:hidden [&_svg]:size-4"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
          <Button
            aria-controls="project-sidebar"
            aria-expanded="true"
            aria-label="Collapse projects"
            className="hidden size-8 text-muted-foreground md:inline-flex [&_svg]:size-4"
            onClick={onToggle}
            size="icon-sm"
            variant="ghost"
          >
            <PanelLeft aria-hidden="true" />
          </Button>
        </div>
        <button
          className="mt-4 flex h-9 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-2 text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:bg-sidebar-hover md:h-7"
          onClick={onNewProject}
          type="button"
        >
          <SquarePen aria-hidden="true" className="text-muted-foreground" />
          New project
        </button>
        <nav
          aria-label="Projects"
          className="app-scrollbar scroll-fade -mr-3 mt-4 min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable] md:-mr-2 md:pr-2"
        >
          <p className="px-2 pb-1.5 text-sm font-medium text-muted-foreground">Projects</p>
          {projects.map((project) => (
            <ProjectSidebarItem
              isSelected={selectedProjectId === project.projectId}
              key={project.projectId}
              onDelete={openDelete}
              onNavigate={onClose}
              project={project}
            />
          ))}
          {status === "CanLoadMore" && (
            <Button className="mt-3 w-full" onClick={() => loadMore(50)} size="sm" variant="ghost">
              Load older projects
            </Button>
          )}
        </nav>
      </aside>
      <DeleteProjectDialog
        onClose={() => setDeleteTarget(undefined)}
        onDeleted={projectDeleted}
        target={deleteTarget}
      />
    </>
  );
}
