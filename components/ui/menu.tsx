import type { ComponentProps, CSSProperties } from "react";

import { cn } from "@/lib/utils";

type MenuContentProps = Omit<ComponentProps<"div">, "id" | "popover"> & {
  readonly id: string;
  readonly side?: "bottom" | "top";
};

export function getMenuAnchorStyle(id: string): CSSProperties {
  return { anchorName: `--${id}` };
}

export function MenuContent({ children, className, id, side, style, ...props }: MenuContentProps) {
  return (
    <div
      className={cn(
        "m-1 rounded-lg border border-border/40 bg-accent p-1 text-foreground shadow-lg shadow-black/40",
        className,
      )}
      {...props}
      id={id}
      popover="auto"
      style={{ ...style, positionAnchor: `--${id}` }}
    >
      {side === "bottom" && (
        <span className="pointer-events-none absolute -top-1 right-3 size-2 rotate-45 border-t border-l border-border/40 bg-accent" />
      )}
      {side === "top" && (
        <span className="pointer-events-none absolute -bottom-1 right-3 size-2 rotate-45 border-r border-b border-border/40 bg-accent" />
      )}
      {children}
    </div>
  );
}

export function MenuItem({ className, type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "mb-0.5 flex h-7 w-full items-center gap-1.5 rounded-sm px-2 text-left outline-none transition-colors last:mb-0 hover:bg-sidebar-selected focus-visible:bg-sidebar-selected disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
