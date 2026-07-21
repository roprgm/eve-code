import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function CodeBlock({ className, ...props }: ComponentProps<"pre">) {
  return (
    <pre
      className={cn(
        "app-scrollbar scroll-fade max-h-64 overflow-y-auto wrap-anywhere whitespace-pre-wrap font-mono text-sm",
        className,
      )}
      {...props}
    />
  );
}
