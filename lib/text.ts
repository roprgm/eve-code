export function joinNonEmptyLines(lines: readonly string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
