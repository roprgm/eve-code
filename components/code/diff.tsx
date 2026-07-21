import { lazy, Suspense } from "react";

const DiffRenderer = lazy(() => import("@/components/code/diff-renderer"));

export default function Diff({ patch }: { readonly patch: string }) {
  return (
    <Suspense fallback={null}>
      <DiffRenderer patch={patch} />
    </Suspense>
  );
}
