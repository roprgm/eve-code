import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { href, Link } from "react-router";
import { ProjectSidebarActions } from "@/components/projects/project-sidebar-actions";
import type { SessionStatus } from "@/components/session/use-session";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export type ProjectSummary = {
  readonly sessionId: string;
  readonly name: string;
  readonly projectId: string;
  readonly status: SessionStatus;
};

export function ProjectSidebarItem({
  isSelected,
  onDelete,
  onNavigate,
  project,
}: {
  readonly isSelected: boolean;
  readonly onDelete: (project: ProjectSummary) => void;
  readonly onNavigate: () => void;
  readonly project: ProjectSummary;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setEditing] = useState(false);
  const renameProject = useMutation({
    mutationFn: useConvexMutation(api.projects.rename),
    onSuccess: () => setEditing(false),
  });

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  function saveName(): void {
    const name = inputRef.current?.value.trim();
    if (!name || name === project.name) {
      setEditing(false);
      return;
    }

    renameProject.mutate({ name, projectId: project.projectId });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    inputRef.current?.blur();
  }

  function cancel(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Escape") return;
    event.currentTarget.value = project.name;
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
            aria-invalid={renameProject.isError}
            aria-label={`Rename ${project.name}`}
            className="w-full bg-transparent outline-none aria-invalid:text-destructive"
            defaultValue={project.name}
            disabled={renameProject.isPending}
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
          to={href("/p/:projectId", { projectId: project.projectId })}
        >
          <span className="block truncate">{project.name}</span>
        </Link>
      )}
      {!isEditing && (
        <ProjectSidebarActions
          name={project.name}
          onDelete={() => onDelete(project)}
          onRename={() => {
            renameProject.reset();
            setEditing(true);
          }}
          projectId={project.projectId}
          status={project.status}
        />
      )}
    </div>
  );
}
