import { ChevronRight, type LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import type { ActivityTiming } from "@/lib/eve-events";

function formatElapsed(milliseconds: number): string {
  const seconds = Math.max(Math.round(milliseconds / 1000), 1);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function useElapsed(
  timing: ActivityTiming | undefined,
  isRunning: boolean,
): string | undefined {
  const isTicking = isRunning && timing?.startedAt !== undefined && timing.endedAt === undefined;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isTicking) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isTicking]);

  if (timing?.startedAt === undefined) return;
  const endedAt = timing.endedAt ?? (isTicking ? now : undefined);
  if (endedAt === undefined) return;
  return formatElapsed(endedAt - timing.startedAt);
}

type ModelActivityProps = {
  readonly children?: ReactNode;
  readonly detail?: ReactNode;
  readonly elapsed?: string;
  readonly icon: LucideIcon;
  readonly isAnimated: boolean;
  readonly label: string;
  readonly meta?: ReactNode;
};

export function ModelActivity({
  children,
  detail,
  elapsed,
  icon: Icon,
  isAnimated,
  label,
  meta,
}: ModelActivityProps) {
  const summary = (
    <>
      <Icon aria-hidden="true" className="shrink-0 self-center" />
      <span className="min-w-0 truncate">
        <span className={isAnimated ? "shimmer" : undefined}>{label}</span>
        {detail && <span className="font-mono text-sm"> {detail}</span>}
      </span>
      {elapsed && <span className="shrink-0 text-sm opacity-60">{elapsed}</span>}
      {meta}
    </>
  );

  if (!children) {
    return (
      <article
        aria-label={label}
        className="flex items-baseline gap-2 text-muted-foreground"
        role="status"
      >
        {summary}
      </article>
    );
  }

  return (
    <details className="reasoning-details group open:pb-1">
      <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronRight
          aria-hidden="true"
          className="shrink-0 self-center transition-transform group-open:rotate-90"
        />
      </summary>
      <div className="mt-1 ml-2 max-w-3xl border-l pl-3 text-muted-foreground">{children}</div>
    </details>
  );
}
