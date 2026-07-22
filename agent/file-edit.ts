const fileMutations = new Map<string, Promise<void>>();

export type FileEdit = {
  readonly newText: string;
  readonly oldText: string;
};

type Match = FileEdit & { readonly end: number; readonly start: number };

export async function queueFileMutation<T>(key: string, mutation: () => Promise<T>): Promise<T> {
  const previous = fileMutations.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(mutation);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  fileMutations.set(key, settled);
  try {
    return await result;
  } finally {
    if (fileMutations.get(key) === settled) fileMutations.delete(key);
  }
}

function getMatch(original: string, edit: FileEdit, index: number): Match {
  const start = original.indexOf(edit.oldText);
  if (start < 0) throw new Error(`Edit ${index}: oldText was not found.`);
  if (original.indexOf(edit.oldText, start + 1) >= 0) {
    throw new Error(`Edit ${index}: oldText matches more than once.`);
  }
  if (edit.oldText === edit.newText) {
    throw new Error(`Edit ${index}: oldText and newText are identical.`);
  }
  return { ...edit, end: start + edit.oldText.length, start };
}

export function applyFileEdits(original: string, edits: readonly FileEdit[]): string {
  const matches = edits.map((edit, index) => getMatch(original, edit, index + 1));
  matches.sort((left, right) => left.start - right.start);

  let result = "";
  let end = 0;
  for (const match of matches) {
    if (match.start < end) throw new Error("Edits overlap. Merge nearby changes.");
    result += original.slice(end, match.start) + match.newText;
    end = match.end;
  }
  return result + original.slice(end);
}
