import { useEffect, useState } from "react";

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
