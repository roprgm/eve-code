import { File } from "@pierre/diffs/react";
import { FileTree } from "@pierre/trees/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { z } from "zod";

import { useWorkspaceTree } from "@/components/workspace/use-workspace-tree";
import { WorkspaceBrowser } from "@/components/workspace/workspace-browser";
import type { WorkspaceFileRequest } from "@/components/workspace/workspace-navigation";
import { getWorkspaceUrl, workspaceFileSchema, workspacePathsSchema } from "@/lib/workspace";

const emptyPaths: string[] = [];
const fileOptions = {
  disableFileHeader: true,
  theme: "pierre-dark-soft",
  themeType: "dark",
  unsafeCSS: "pre { --diffs-bg: var(--background) !important; }",
} as const;

type WorkspaceFile = z.infer<typeof workspaceFileSchema>;

async function getWorkspace<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the workspace.");
  return schema.parse(await response.json());
}

function FileViewer({ contents, path }: { readonly contents: string; readonly path: string }) {
  const file = { contents, name: path };
  return <File className="app-scrollbar workspace-file" file={file} options={fileOptions} />;
}

function PanelMessage({ children }: { readonly children: ReactNode }) {
  return (
    <p className="flex size-full items-center justify-center p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function WorkspaceTree({
  hasPaths,
  isError,
  model,
  paths,
  sessionId,
}: {
  readonly hasPaths: boolean;
  readonly isError: boolean;
  readonly model: ReturnType<typeof useWorkspaceTree>["model"];
  readonly paths: string[];
  readonly sessionId: string;
}) {
  if (!sessionId) return <PanelMessage>No files yet.</PanelMessage>;
  if (isError && !hasPaths) return <PanelMessage>Couldn’t load files.</PanelMessage>;
  if (!hasPaths) return <PanelMessage>Loading files…</PanelMessage>;
  if (paths.length === 0) return <PanelMessage>No files yet.</PanelMessage>;
  return <FileTree className="workspace-tree" model={model} />;
}

function WorkspaceViewer({
  file,
  isError,
  selectedPath,
}: {
  readonly file?: WorkspaceFile;
  readonly isError: boolean;
  readonly selectedPath: string;
}) {
  if (!selectedPath) return <PanelMessage>Select a file</PanelMessage>;
  if (file?.status === "missing") return <PanelMessage>File no longer exists.</PanelMessage>;
  if (file?.status === "binary") {
    return <PanelMessage>Binary files can’t be previewed.</PanelMessage>;
  }
  if (file?.status === "oversized") {
    return <PanelMessage>Files larger than 200 KiB can’t be previewed.</PanelMessage>;
  }
  if (file?.status === "text") {
    return <FileViewer contents={file.contents} path={file.path} />;
  }
  if (isError) return <PanelMessage>Couldn’t load file.</PanelMessage>;
  return <PanelMessage>Loading file…</PanelMessage>;
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
  const baseUrl = getWorkspaceUrl(sessionId);
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

  return (
    <aside
      aria-label="Workspace files"
      className="min-h-0 w-full md:w-1/2 md:border-l"
      id="workspace-panel"
    >
      <WorkspaceBrowser
        model={model}
        path={selectedPath}
        tree={
          <WorkspaceTree
            hasPaths={Boolean(pathsQuery.data)}
            isError={pathsQuery.isError}
            model={model}
            paths={paths}
            sessionId={sessionId}
          />
        }
      >
        <WorkspaceViewer file={file} isError={fileQuery.isError} selectedPath={selectedPath} />
      </WorkspaceBrowser>
    </aside>
  );
}
