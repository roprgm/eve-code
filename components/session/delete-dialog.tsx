import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";

import type { SessionSummary } from "@/components/session/sidebar-item";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { clearSessionRuntime } from "@/lib/session-runtime";

type DeleteSessionDialogProps = {
  readonly onClose: () => void;
  readonly onDeleted: (sessionId: string) => void;
  readonly target?: SessionSummary;
};

export function DeleteSessionDialog({ onClose, onDeleted, target }: DeleteSessionDialogProps) {
  const removeSession = useMutation({ mutationFn: useConvexMutation(api.sessions.remove) });

  function remove(): void {
    if (!target) return;
    removeSession.mutate(
      { sessionId: target.sessionId },
      {
        onSuccess: () => {
          clearSessionRuntime(target.sessionId);
          onDeleted(target.sessionId);
          document.querySelector<HTMLDialogElement>("#delete-session-dialog")?.close();
        },
      },
    );
  }

  return (
    <dialog
      aria-describedby="delete-session-description"
      aria-labelledby="delete-session-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border bg-card p-5 text-card-foreground shadow-2xl backdrop:bg-black/70"
      id="delete-session-dialog"
      onCancel={(event) => removeSession.isPending && event.preventDefault()}
      onClose={() => {
        removeSession.reset();
        onClose();
      }}
    >
      <h2 className="font-medium" id="delete-session-title">
        Delete session permanently?
      </h2>
      <p className="mt-2 text-muted-foreground" id="delete-session-description">
        “{target?.name}” and its history cannot be recovered.
      </p>
      {removeSession.isError && (
        <Alert className="mt-4" variant="destructive">
          Could not delete this session.
        </Alert>
      )}
      <form className="mt-5 flex justify-end gap-2" method="dialog">
        <Button disabled={removeSession.isPending} type="submit" variant="outline">
          Cancel
        </Button>
        <Button disabled={removeSession.isPending} onClick={remove} variant="destructive">
          Delete
        </Button>
      </form>
    </dialog>
  );
}
