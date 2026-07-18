import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type MenuContentProps = ComponentProps<"div"> & {
  readonly side: "bottom" | "top";
};

export function MenuContent({ children, className, side, ...props }: MenuContentProps) {
  return (
    <div
      className={cn(
        "m-0 rounded-lg border border-border/40 bg-muted p-1 text-foreground shadow-xl",
        className,
      )}
      {...props}
    >
      {side === "bottom" && (
        <span className="pointer-events-none absolute -top-1 right-3 size-2 rotate-45 border-t border-l border-border/40 bg-muted" />
      )}
      {side === "top" && (
        <span className="pointer-events-none absolute -bottom-1 right-3 size-2 rotate-45 border-r border-b border-border/40 bg-muted" />
      )}
      {children}
    </div>
  );
}

export function MenuItem({ className, type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "mb-0.5 flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 text-left outline-none transition-colors last:mb-0 hover:bg-sidebar-selected focus-visible:bg-sidebar-selected disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
