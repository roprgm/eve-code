import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ModelActivityProps = {
  readonly children?: ReactNode;
  readonly detail?: string;
  readonly elapsed?: string;
  readonly icon?: LucideIcon;
  readonly isAnimated?: boolean;
  readonly label: string;
};

function ActivitySummary({
  detail,
  elapsed,
  icon: Icon,
  isAnimated,
  label,
}: Omit<ModelActivityProps, "children">) {
  return (
    <>
      {Icon && <Icon aria-hidden="true" className="shrink-0" />}
      <span className={isAnimated ? "shimmer shrink-0" : "shrink-0"}>{label}</span>
      {detail && <span className="min-w-0 truncate font-mono text-sm">{detail}</span>}
      {elapsed && <span className="shrink-0 text-sm opacity-60">{elapsed}</span>}
    </>
  );
}

export function ModelActivity({
  children,
  detail,
  elapsed,
  icon,
  isAnimated,
  label,
}: ModelActivityProps) {
  if (!children) {
    return (
      <article
        aria-label={label}
        className="flex items-center gap-2 py-0.5 text-muted-foreground"
        role="status"
      >
        <ActivitySummary
          detail={detail}
          elapsed={elapsed}
          icon={icon}
          isAnimated={isAnimated}
          label={label}
        />
      </article>
    );
  }

  return (
    <details className="reasoning-details group py-0.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ActivitySummary
          detail={detail}
          elapsed={elapsed}
          icon={icon}
          isAnimated={isAnimated}
          label={label}
        />
        <ChevronRight
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-90"
        />
      </summary>
      <div className="mt-2 ml-2 max-w-3xl border-l pl-3 text-muted-foreground">{children}</div>
    </details>
  );
}
