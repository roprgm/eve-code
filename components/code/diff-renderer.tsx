import { trimPatchContext } from "@pierre/diffs";
import { PatchDiff } from "@pierre/diffs/react";

const diffOptions = {
  diffIndicators: "none",
  diffStyle: "unified",
  hunkSeparators: "simple",
  theme: "pierre-dark",
  themeType: "dark",
  unsafeCSS: "[data-diffs-header] { display: none; } [data-line] span { opacity: .8; }",
} as const;

export default function DiffRenderer({ patch }: { readonly patch: string }) {
  const inlinePatch = trimPatchContext(patch, 1);
  return (
    <PatchDiff
      className="app-scrollbar scroll-fade max-h-64 overflow-auto rounded-md bg-muted [--diffs-dark:var(--muted-foreground)] [--diffs-dark-bg:var(--muted)] [--diffs-font-size:11px] [--diffs-gap-block:0px] [--diffs-line-height:var(--text-sm--line-height)]"
      options={diffOptions}
      patch={inlinePatch}
    />
  );
}
