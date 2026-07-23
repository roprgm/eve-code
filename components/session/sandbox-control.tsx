import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, ExternalLink, LoaderCircle, Play, Power } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getMenuAnchorStyle, MenuContent, MenuItem } from "@/components/ui/menu";
import type { Preview } from "@/lib/preview";
import { getWorkspaceUrl } from "@/lib/workspace";

const sandboxSchema = z.object({
  status: z.enum([
    "aborted",
    "failed",
    "missing",
    "pending",
    "running",
    "snapshotting",
    "stopped",
    "stopping",
  ]),
  url: z.string().url().optional(),
});

type SandboxAction = "run" | "stop";
type SandboxStatus = z.infer<typeof sandboxSchema>["status"];
type VisibleStatus = SandboxStatus | "checking";
type PreviewAction = "open" | "run" | "wait";

type ControlState = {
  readonly action: PreviewAction;
  readonly disabled: boolean;
  readonly label: string;
  readonly title?: string;
};

function openPreviewTab(url?: string): Window | null {
  const previewTab = window.open("about:blank", "_blank");
  if (!previewTab) return null;
  previewTab.opener = null;
  if (url) previewTab.location.replace(url);
  return previewTab;
}

function getMethod(action: "status" | SandboxAction): "DELETE" | "GET" | "POST" {
  if (action === "status") return "GET";
  if (action === "run") return "POST";
  return "DELETE";
}

async function requestSandbox(action: "status" | SandboxAction, preview: Preview) {
  const init: RequestInit = { method: getMethod(action) };
  if (action === "run") {
    init.body = JSON.stringify({ command: preview.command, port: preview.port });
    init.headers = { "content-type": "application/json" };
  }
  const response = await fetch(`/eve/v1/sandbox/${encodeURIComponent(preview.sandboxId)}`, init);
  if (!response.ok) throw new Error("Could not control the preview.");
  return sandboxSchema.parse(await response.json());
}

function getStatusLabel(status: VisibleStatus): string {
  if (status === "pending") return "Starting";
  if (status === "snapshotting") return "Stopping";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getSandboxLabel(sandboxId: string): string {
  if (sandboxId.length <= 12) return sandboxId;
  return `…${sandboxId.slice(-8)}`;
}

function PreviewIcon({ action }: { readonly action: PreviewAction }) {
  if (action === "open") return <ExternalLink aria-hidden="true" />;
  if (action === "wait") {
    return <LoaderCircle aria-hidden="true" className="animate-spin" />;
  }
  return <Play aria-hidden="true" />;
}

function PreviewControl({
  action,
  disabled,
  isDownloadDisabled,
  label,
  menuId,
  onDownload,
  onPreview,
  onStop,
  preview,
  status,
  title,
}: {
  readonly action: PreviewAction;
  readonly disabled: boolean;
  readonly isDownloadDisabled: boolean;
  readonly label: string;
  readonly menuId: string;
  readonly onDownload: () => void;
  readonly onPreview: () => void;
  readonly onStop?: () => void;
  readonly preview: Preview;
  readonly status: VisibleStatus;
  readonly title?: string;
}) {
  let stopAction: ReactNode;
  if (onStop) {
    stopAction = (
      <MenuItem className="text-sm text-destructive" onClick={onStop} popoverTarget={menuId}>
        <Power aria-hidden="true" className="size-3.5" />
        Stop preview
      </MenuItem>
    );
  }
  return (
    <div className="ml-auto flex">
      <Button
        className="rounded-r-none [&_svg]:size-3.5"
        disabled={disabled}
        onClick={onPreview}
        size="sm"
        title={title}
      >
        <PreviewIcon action={action} />
        {label}
      </Button>
      <Button
        aria-label="Preview status and actions"
        className="rounded-l-none border-l border-primary-foreground/20 [&_svg]:size-3.5"
        disabled={disabled}
        popoverTarget={menuId}
        size="icon-sm"
        style={getMenuAnchorStyle(menuId)}
      >
        <ChevronDown aria-hidden="true" />
      </Button>
      <MenuContent
        className="w-48 [position-area:bottom_span-left] [position-try-fallbacks:flip-block]"
        id={menuId}
        side="bottom"
      >
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">Status</span>
          <span className="text-right font-medium">{getStatusLabel(status)}</span>
          <span className="text-muted-foreground">Ports</span>
          <span className="text-right font-mono">{preview.port}</span>
          <span className="text-muted-foreground">Sandbox</span>
          <span className="truncate text-right font-mono" title={preview.sandboxId}>
            {getSandboxLabel(preview.sandboxId)}
          </span>
        </div>
        <div className="mt-1 border-t pt-1">
          <MenuItem
            className="text-sm"
            disabled={isDownloadDisabled}
            onClick={onDownload}
            popoverTarget={menuId}
          >
            <Download aria-hidden="true" className="size-3.5" />
            Download Zip
          </MenuItem>
          {stopAction}
        </div>
      </MenuContent>
    </div>
  );
}

function getVisibleStatus(
  status: SandboxStatus | undefined,
  isLoading: boolean,
  isPending: boolean,
  pendingAction: SandboxAction | undefined,
): VisibleStatus {
  if (isPending && pendingAction === "run") return "pending";
  if (isPending) return "stopping";
  if (status) return status;
  if (isLoading) return "checking";
  return "failed";
}

function getControlState(status: VisibleStatus, hasError: boolean): ControlState {
  if (status === "running") return { action: "open", disabled: false, label: "Preview" };
  if (status === "pending") return { action: "wait", disabled: true, label: "Starting" };
  if (status === "stopping" || status === "snapshotting") {
    return { action: "wait", disabled: true, label: "Stopping" };
  }
  if (status === "checking") return { action: "wait", disabled: true, label: "Checking" };
  if (status === "missing") {
    return { action: "run", disabled: true, label: "Preview", title: "Preview unavailable" };
  }
  if (status === "failed" || status === "aborted" || hasError) {
    return { action: "run", disabled: false, label: "Retry" };
  }
  return { action: "run", disabled: false, label: "Preview" };
}

export function SandboxControl({ preview, sessionId }: { preview: Preview; sessionId?: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["sandbox", preview.sandboxId, preview.port] as const;
  const sandbox = useQuery({
    queryFn: () => requestSandbox("status", preview),
    queryKey,
    refetchInterval: 5_000,
    staleTime: 0,
    throwOnError: false,
  });
  const action = useMutation({
    mutationFn: (next: SandboxAction) => requestSandbox(next, preview),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const status = getVisibleStatus(
    sandbox.data?.status,
    sandbox.isLoading,
    action.isPending,
    action.variables,
  );
  const control = getControlState(status, action.isError || sandbox.isError);
  const url = sandbox.data?.url ?? preview.url;

  function onStop(): void {
    action.mutate("stop");
  }

  function onDownload(): void {
    if (!sessionId) return;
    window.location.assign(`${getWorkspaceUrl(sessionId)}/download`);
  }

  function onPreview(): void {
    if (control.action === "open") {
      openPreviewTab(url);
      return;
    }
    if (control.action !== "run") return;
    const previewTab = openPreviewTab();
    action.mutate("run", {
      onError: () => previewTab?.close(),
      onSuccess: (data) => {
        if (!previewTab || previewTab.closed) return;
        previewTab.location.replace(data.url ?? preview.url);
      },
    });
  }

  let stopPreview: (() => void) | undefined;
  if (status === "running") stopPreview = onStop;
  const isDownloadDisabled = !sessionId;

  return (
    <PreviewControl
      action={control.action}
      disabled={control.disabled}
      isDownloadDisabled={isDownloadDisabled}
      label={control.label}
      menuId={`sandbox-info-${preview.sandboxId}`}
      onDownload={onDownload}
      onPreview={onPreview}
      onStop={stopPreview}
      preview={preview}
      status={status}
      title={control.title}
    />
  );
}
