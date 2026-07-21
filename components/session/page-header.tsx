import { ExternalLink, PanelLeft } from "lucide-react";
import { useOutletContext } from "react-router";

import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  readonly previewUrl?: string;
  readonly title: string;
};

function PreviewButton({ url }: { readonly url?: string }) {
  if (!url) return null;

  function openPreview(): void {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button className="ml-auto" onClick={openPreview} variant="outline">
      <ExternalLink aria-hidden="true" />
      Open app
    </Button>
  );
}

export function PageHeader({ previewUrl, title }: PageHeaderProps) {
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
      <PreviewButton url={previewUrl} />
    </header>
  );
}
