import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({ value }: { readonly value: string }) {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1_200);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <>
      <Button
        aria-label="Copy message"
        className="text-muted-foreground"
        onClick={copy}
        size="icon-sm"
        title="Copy"
        variant="ghost"
      >
        {isCopied && <Check aria-hidden="true" className="fade" />}
        {!isCopied && <Copy aria-hidden="true" />}
      </Button>
      {isCopied && (
        <span className="sr-only" role="status">
          Copied
        </span>
      )}
    </>
  );
}
