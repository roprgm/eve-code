import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  readonly variant?: AlertVariant;
};

const variants: Record<AlertVariant, string> = {
  default: "bg-card text-card-foreground",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      className={cn("rounded-md border px-3 py-2", variants[variant], className)}
      role="alert"
      {...props}
    />
  );
}
