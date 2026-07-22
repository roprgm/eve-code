import { FileTree } from "@pierre/trees/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { z } from "zod";

import FileViewer from "@/components/code/file-viewer";
import { useWorkspaceTree } from "@/components/workspace/use-workspace-tree";
import { WorkspaceBrowser } from "@/components/workspace/workspace-browser";
import type { WorkspaceFileRequest } from "@/components/workspace/workspace-navigation";
import { workspaceFileSchema, workspacePathsSchema } from "@/lib/workspace";

const emptyPaths: string[] = [];

async function getWorkspace<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the workspace.");
  return schema.parse(await response.json());
}

function PanelMessage({ children }: { readonly children: ReactNode }) {
  return (
    <p className="flex size-full items-center justify-center p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default function WorkspacePanel({
  requestedFile,
  revision,
  sessionId,
}: {
  readonly requestedFile: WorkspaceFileRequest;
  readonly revision: number;
  readonly sessionId: string;
}) {
  const baseUrl = `/eve/v1/workspace/${encodeURIComponent(sessionId)}`;
  const pathsQuery = useQuery({
    enabled: Boolean(sessionId),
    placeholderData: keepPreviousData,
    queryFn: () => getWorkspace(baseUrl, workspacePathsSchema),
    queryKey: ["workspace", sessionId, revision],
    throwOnError: false,
  });
  const paths = pathsQuery.data ?? emptyPaths;
  const { model, selectedPath } = useWorkspaceTree(paths, requestedFile);
  const fileUrl = `${baseUrl}/file?path=${encodeURIComponent(selectedPath)}`;
  const fileQuery = useQuery({
    enabled: Boolean(sessionId && selectedPath),
    placeholderData: keepPreviousData,
    queryFn: () => getWorkspace(fileUrl, workspaceFileSchema),
    queryKey: ["workspace-file", sessionId, revision, selectedPath],
    throwOnError: false,
  });
  const file = fileQuery.data?.path === selectedPath ? fileQuery.data : undefined;

  let tree: ReactNode = <PanelMessage>Loading files…</PanelMessage>;
  if (!sessionId) tree = <PanelMessage>No files yet.</PanelMessage>;
  if (pathsQuery.isError && !pathsQuery.data)
    tree = <PanelMessage>Couldn’t load files.</PanelMessage>;
  if (pathsQuery.data && paths.length === 0) tree = <PanelMessage>No files yet.</PanelMessage>;
  if (paths.length > 0) {
    tree = <FileTree className="workspace-tree" model={model} />;
  }

  let viewer: ReactNode = <PanelMessage>Select a file</PanelMessage>;
  if (selectedPath) viewer = <PanelMessage>Loading file…</PanelMessage>;
  if (selectedPath && fileQuery.isError) viewer = <PanelMessage>Couldn’t load file.</PanelMessage>;
  if (file?.status === "missing") viewer = <PanelMessage>File no longer exists.</PanelMessage>;
  if (file?.status === "binary")
    viewer = <PanelMessage>Binary files can’t be previewed.</PanelMessage>;
  if (file?.status === "oversized")
    viewer = <PanelMessage>Files larger than 200 KiB can’t be previewed.</PanelMessage>;
  if (file?.status === "text") viewer = <FileViewer contents={file.contents} path={file.path} />;

  return (
    <aside
      aria-label="Workspace files"
      className="min-h-0 w-full md:w-1/2 md:border-l"
      id="workspace-panel"
    >
      <WorkspaceBrowser model={model} path={selectedPath} tree={tree}>
        {viewer}
      </WorkspaceBrowser>
    </aside>
  );
}
