import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";

import type { ProjectSummary } from "@/components/projects/project-sidebar-item";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { clearSessionRuntime } from "@/lib/session-runtime";

type DeleteProjectDialogProps = {
  readonly onClose: () => void;
  readonly onDeleted: (projectId: string) => void;
  readonly target?: ProjectSummary;
};

export function DeleteProjectDialog({ onClose, onDeleted, target }: DeleteProjectDialogProps) {
  const removeProject = useMutation({ mutationFn: useConvexMutation(api.projects.remove) });

  function remove(): void {
    if (!target) return;
    removeProject.mutate(
      { projectId: target.projectId },
      {
        onSuccess: () => {
          clearSessionRuntime(target.sessionId);
          onDeleted(target.projectId);
          document.querySelector<HTMLDialogElement>("#delete-project-dialog")?.close();
        },
      },
    );
  }

  return (
    <dialog
      aria-describedby="delete-project-description"
      aria-labelledby="delete-project-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border bg-card p-5 text-card-foreground shadow-2xl backdrop:bg-black/70"
      id="delete-project-dialog"
      onCancel={(event) => removeProject.isPending && event.preventDefault()}
      onClose={() => {
        removeProject.reset();
        onClose();
      }}
    >
      <h2 className="font-medium" id="delete-project-title">
        Delete project permanently?
      </h2>
      <p className="mt-2 text-muted-foreground" id="delete-project-description">
        “{target?.name}” and its conversation cannot be recovered.
      </p>
      {removeProject.isError && (
        <Alert className="mt-4" variant="destructive">
          Could not delete this project.
        </Alert>
      )}
      <form className="mt-5 flex justify-end gap-2" method="dialog">
        <Button disabled={removeProject.isPending} type="submit" variant="outline">
          Cancel
        </Button>
        <Button disabled={removeProject.isPending} onClick={remove} variant="destructive">
          Delete
        </Button>
      </form>
    </dialog>
  );
}
