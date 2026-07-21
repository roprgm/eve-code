import { useEffect, useState } from "react";
import { href, Outlet, useMatch, useNavigate } from "react-router";

import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { useComposerStore } from "@/lib/composer-store";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);

  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function App() {
  const projectId = useMatch("/p/:projectId")?.params.projectId ?? null;
  const navigate = useNavigate();
  const setDraft = useComposerStore((state) => state.setDraft);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isSidebarExpanded = isMobile ? isSidebarOpen : !isSidebarCollapsed;

  function toggleSidebar(): void {
    if (isMobile) {
      setSidebarOpen(true);
      return;
    }

    setSidebarCollapsed((isCollapsed) => !isCollapsed);
  }

  function openNewProject(): void {
    setDraft("");
    setSidebarOpen(false);
    void navigate(href("/"));
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        isCollapsed={isSidebarCollapsed && !isMobile}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewProject={openNewProject}
        onToggle={toggleSidebar}
        selectedProjectId={projectId}
      />
      <div className="flex min-w-0 flex-1" inert={isMobile && isSidebarOpen}>
        <Outlet context={{ isSidebarExpanded, openNewProject, toggleSidebar }} />
      </div>
    </div>
  );
}
