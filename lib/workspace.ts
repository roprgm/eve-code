import { z } from "zod";

export const workspacePathCountMax = 10_000;
export const workspacePathSchema = z.string().min(1).max(4096);
export const workspacePathsSchema = z.array(workspacePathSchema).max(workspacePathCountMax);
export const workspaceFileSchema = z.discriminatedUnion("status", [
  z.object({ contents: z.string(), path: workspacePathSchema, status: z.literal("text") }),
  z.object({ path: workspacePathSchema, status: z.enum(["binary", "missing", "oversized"]) }),
]);

export type WorkspaceFile = Readonly<z.infer<typeof workspaceFileSchema>>;

export function getWorkspaceUrl(sessionId: string): string {
  return `/eve/v1/workspace/${encodeURIComponent(sessionId)}`;
}
