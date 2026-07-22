export function getStringProperty(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return;
  const property = (value as Record<string, unknown>)[key];
  if (typeof property === "string") return property;
}
