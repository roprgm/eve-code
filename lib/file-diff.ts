import { createPatch } from "diff";
import { z } from "zod";

const fileBytesMax = 5_000_000;
const diffCharactersMax = 500_000;

export const fileDiffSchema = z.object({ diff: z.string().min(1) });

export type FileDiff = Readonly<z.infer<typeof fileDiffSchema>>;

export function computeFileDiff(
  path: string,
  original: string | null,
  edited: string,
): FileDiff | undefined {
  if (original === null || original === edited) return;
  if (
    Buffer.byteLength(original, "utf8") > fileBytesMax ||
    Buffer.byteLength(edited, "utf8") > fileBytesMax
  ) {
    return;
  }
  const diff = createPatch(path, original, edited, undefined, undefined, {
    context: 4,
    timeout: 2_000,
  });
  if (!diff || diff.length > diffCharactersMax) return;
  return { diff };
}

export function getFileDiffStats(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  let isHunk = false;
  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) isHunk = true;
    if (!isHunk) continue;
    if (line.startsWith("+")) additions += 1;
    if (line.startsWith("-")) deletions += 1;
  }
  return { additions, deletions };
}

export function parseFileDiff(value: unknown): FileDiff | undefined {
  return fileDiffSchema.safeParse(value).data;
}
