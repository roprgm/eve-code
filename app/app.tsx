import { useEffect, useState } from "react";
import { Outlet, useMatch } from "react-router";

import { ProjectSidebar } from "@/components/projects/project-sidebar";

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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedProjectId={projectId}
      />
      <div className="flex min-w-0 flex-1" inert={isMobile && isSidebarOpen}>
        <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
      </div>
    </div>
  );
}
