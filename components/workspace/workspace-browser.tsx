import type { UseFileTreeResult } from "@pierre/trees/react";
import { ChevronRight } from "lucide-react";
import { Fragment, type MouseEvent, type ReactNode, useRef } from "react";

import { getMenuAnchorStyle, MenuContent } from "@/components/ui/menu";

const popoverId = "workspace-browser";
const headerStyle = getMenuAnchorStyle(popoverId);

type TreeModel = UseFileTreeResult["model"];
type Breadcrumb = { readonly label: string; readonly path: string };

type WorkspaceBrowserProps = {
  readonly children: ReactNode;
  readonly model: TreeModel;
  readonly path: string;
  readonly tree: ReactNode;
};

function getBreadcrumbs(path: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [{ label: "workspace", path: "" }];
  let currentPath = "";
  for (const segment of path.split("/")) {
    if (!segment) continue;
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    breadcrumbs.push({ label: segment, path: currentPath });
  }
  return breadcrumbs;
}

export function WorkspaceBrowser({ children, model, path, tree }: WorkspaceBrowserProps) {
  const popover = useRef<HTMLDivElement>(null);
  const breadcrumbs = getBreadcrumbs(path);

  function onOpenPath(itemPath: string): void {
    if (!itemPath) {
      model.focusNearestPath(null);
      return;
    }
    const item = model.getItem(itemPath);
    if (!item) return;
    if ("expand" in item) item.expand();
    model.scrollToPath(itemPath, { focus: true, offset: "top" });
  }

  function onTreeClick(event: MouseEvent<HTMLDivElement>): void {
    const row = event.nativeEvent
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          target instanceof HTMLElement && target.dataset.type === "item",
      );
    if (!row) return;
    const item = model.getItem(row.dataset.itemPath ?? "");
    if (item?.isDirectory() === false) popover.current?.hidePopover();
  }

  const breadcrumbItems = breadcrumbs.map((breadcrumb, index) => {
    return (
      <Fragment key={breadcrumb.path}>
        {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5" />}
        <button
          className="max-w-48 truncate rounded-sm px-1 py-0.5 text-sm text-muted-foreground outline-none hover:bg-sidebar-selected hover:text-foreground focus-visible:bg-sidebar-selected focus-visible:text-foreground last:text-foreground"
          onClick={() => onOpenPath(breadcrumb.path)}
          popoverTarget={popoverId}
          popoverTargetAction="show"
          type="button"
        >
          {breadcrumb.label}
        </button>
      </Fragment>
    );
  });

  return (
    <div className="flex size-full min-h-0 flex-col">
      <header
        className="flex h-10 shrink-0 items-center gap-0.5 overflow-hidden border-b px-3"
        style={headerStyle}
      >
        {breadcrumbItems}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <MenuContent
        className="m-2 h-72 w-96 max-w-[calc(100vw-2rem)] overflow-hidden [position-area:bottom_span-right] [position-try-fallbacks:flip-block]"
        id={popoverId}
        onClick={onTreeClick}
        ref={popover}
      >
        {tree}
      </MenuContent>
    </div>
  );
}
