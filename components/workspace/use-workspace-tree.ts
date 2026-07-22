import { type UseFileTreeResult, useFileTree, useFileTreeSelection } from "@pierre/trees/react";
import { useEffect, useRef } from "react";

import type { WorkspaceFileRequest } from "@/components/workspace/workspace-navigation";

const emptyPaths: string[] = [];
type TreeModel = UseFileTreeResult["model"];

type WorkspaceTree = {
  readonly model: TreeModel;
  readonly selectedPath: string;
};

function getExpandedPaths(model: TreeModel, paths: readonly string[]): string[] {
  const directories = new Set<string>();
  for (const path of paths) {
    const segments = path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }
  }
  return [...directories].filter((path) => {
    const item = model.getItem(path);
    if (!item || !("isExpanded" in item)) return false;
    return item.isExpanded();
  });
}

function selectFile(model: TreeModel, path: string): boolean {
  const item = model.getItem(path);
  if (!item || item.isDirectory()) return false;
  for (const selectedPath of model.getSelectedPaths()) {
    model.getItem(selectedPath)?.deselect();
  }
  item.select();
  return true;
}

export function useWorkspaceTree(
  paths: readonly string[],
  requestedFile: WorkspaceFileRequest,
): WorkspaceTree {
  const openedRequest = useRef(0);
  const { model } = useFileTree({
    density: "compact",
    flattenEmptyDirectories: true,
    paths: emptyPaths,
  });
  const hasRequestedFile = paths.includes(requestedFile.path);
  useEffect(() => {
    model.resetPaths(paths, { initialExpandedPaths: getExpandedPaths(model, paths) });
  }, [model, paths]);
  useEffect(() => {
    if (!hasRequestedFile) return;
    if (requestedFile.id === openedRequest.current) return;
    if (!selectFile(model, requestedFile.path)) return;
    openedRequest.current = requestedFile.id;
  }, [hasRequestedFile, model, requestedFile.id, requestedFile.path]);

  const selectedPaths = useFileTreeSelection(model);
  const selectedItem = model.getItem(selectedPaths.at(-1) ?? "");
  const selectedPath = selectedItem?.isDirectory() === false ? selectedItem.getPath() : "";
  return { model, selectedPath };
}
