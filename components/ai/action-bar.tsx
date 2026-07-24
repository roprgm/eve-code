import { Check, Copy } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

type ActionBarProps = ComponentProps<"div"> & {
  readonly createdAt?: number;
  readonly text: string;
};

export function ActionBar({ className, createdAt, text, ...props }: ActionBarProps) {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1_200);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div
      className={cn(
        "flex h-6 items-center gap-1 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100",
        className,
      )}
      {...props}
    >
      {createdAt !== undefined && (
        <time className="text-sm" dateTime={new Date(createdAt).toISOString()}>
          {timeFormatter.format(createdAt)}
        </time>
      )}
      <Button
        aria-label={isCopied ? "Copied" : "Copy message"}
        className="text-muted-foreground"
        onClick={copy}
        size="icon-sm"
        title="Copy"
        variant="ghost"
      >
        {isCopied && <Check aria-hidden="true" className="fade" />}
        {!isCopied && <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}
