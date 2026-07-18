import { PanelLeft } from "lucide-react";
import { useOutletContext } from "react-router";

import { Button } from "@/components/ui/button";

export function PageHeader({ title }: { readonly title: string }) {
  const { openSidebar } = useOutletContext<{ readonly openSidebar: () => void }>();

  return (
    <header className="flex h-12 shrink-0 items-center border-b px-3 sm:px-4">
      <Button
        aria-label="Open projects"
        className="md:hidden"
        onClick={openSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeft aria-hidden="true" />
      </Button>
      <h1 className="ml-1 truncate font-medium">{title}</h1>
    </header>
  );
}
