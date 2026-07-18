import { ChevronRight } from "lucide-react";

import { MarkdownMessage } from "@/components/session/markdown-message";

type ModelActivityProps = {
  readonly details?: string;
  readonly isAnimated?: boolean;
  readonly label: string;
};

export function ModelActivity({ details, isAnimated = true, label }: ModelActivityProps) {
  const status = (
    <span className={isAnimated ? "shimmer text-muted-foreground" : "text-muted-foreground"}>
      {label}
    </span>
  );

  if (!details) {
    return (
      <article aria-label={label} className="pt-3 pb-8" role="status">
        {status}
      </article>
    );
  }

  return (
    <details className="reasoning-details group pb-2">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        {status}
        <ChevronRight aria-hidden="true" className="transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-2 ml-2 max-w-3xl border-l pl-3 text-muted-foreground">
        <MarkdownMessage isAnimating={false} text={details} />
      </div>
    </details>
  );
}
