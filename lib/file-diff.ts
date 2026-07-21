export type FileDiff = { readonly diff: string };

export function parseFileDiff(value: unknown): FileDiff | undefined {
  if (!value || typeof value !== "object") return;
  const { diff } = value as Record<string, unknown>;
  if (typeof diff !== "string" || !diff) return;
  return { diff };
}
