import { createContext, type ReactNode, useContext } from "react";

export type WorkspaceFileRequest = {
  readonly id: number;
  readonly path: string;
};

type OpenWorkspaceFile = (path: string) => void;

const WorkspaceNavigationContext = createContext<OpenWorkspaceFile | undefined>(undefined);

export function WorkspaceNavigationProvider({
  children,
  openFile,
}: {
  readonly children: ReactNode;
  readonly openFile: OpenWorkspaceFile;
}) {
  return (
    <WorkspaceNavigationContext.Provider value={openFile}>
      {children}
    </WorkspaceNavigationContext.Provider>
  );
}

export function useOpenWorkspaceFile(): OpenWorkspaceFile {
  const openFile = useContext(WorkspaceNavigationContext);
  if (!openFile) throw new Error("Workspace navigation is unavailable.");
  return openFile;
}
