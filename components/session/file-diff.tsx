import { trimPatchContext } from "@pierre/diffs";
import { PatchDiff } from "@pierre/diffs/react";

const fileDiffOptions = {
  diffIndicators: "none",
  diffStyle: "unified",
  hunkSeparators: "simple",
  unsafeCSS: "[data-diffs-header] { display: none; } [data-line] span { opacity: .8; }",
} as const;

export function FileDiff({ patch }: { readonly patch: string }) {
  const inlinePatch = trimPatchContext(patch, 1);
  return (
    <PatchDiff
      className="app-scrollbar scroll-fade max-h-64 overflow-auto rounded-md [--diffs-dark:var(--muted-foreground)] [--diffs-dark-bg:var(--muted)] [--diffs-font-size:11px] [--diffs-gap-block:0px] [--diffs-light:var(--muted-foreground)] [--diffs-line-height:var(--text-sm--line-height)]"
      options={fileDiffOptions}
      patch={inlinePatch}
    />
  );
}
