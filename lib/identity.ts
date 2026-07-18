export const SESSION_ID_ATTRIBUTE = "sessionId";
export const SESSION_ID_HEADER = "x-eve-code-session";

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;

export function createPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .slice(0, 16);
}

export function isPublicId(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_ID_PATTERN.test(value);
}
