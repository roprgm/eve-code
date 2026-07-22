import { trimPatchContext } from "@pierre/diffs";
import { PatchDiff } from "@pierre/diffs/react";

const diffOptions = {
  diffIndicators: "none",
  diffStyle: "unified",
  hunkSeparators: "simple",
  theme: "pierre-dark-soft",
  themeType: "dark",
  unsafeCSS: "[data-diffs-header] { display: none; } [data-line] span { opacity: .8; }",
} as const;

export default function DiffRenderer({ patch }: { readonly patch: string }) {
  const inlinePatch = trimPatchContext(patch, 20);
  return (
    <PatchDiff
      className="app-scrollbar message-diff scroll-fade max-h-64 overflow-auto rounded-sm bg-muted"
      options={diffOptions}
      patch={inlinePatch}
    />
  );
}
