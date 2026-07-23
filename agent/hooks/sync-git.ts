import { defineHook, type HookContext } from "eve/hooks";

import { getConvexClient } from "@/agent/lib/convex";
import { api } from "@/convex/_generated/api";
import { parseGitHubRepository } from "@/lib/github";
import { isPublicId, SESSION_ID_ATTRIBUTE } from "@/lib/identity";
import { getStringProperty } from "@/lib/object";

type GitState = {
  readonly branch?: string;
  readonly repository?: string;
};

async function getGitState(ctx: HookContext): Promise<GitState> {
  const sandbox = await ctx.getSandbox();
  const result = await sandbox.run({
    command: `for path in /workspace /workspace/*; do
  root=$(git -c safe.directory="$path" -C "$path" rev-parse --show-toplevel 2>/dev/null) || continue
  printf '%s\\n%s\\n' "$(git -c safe.directory="$root" -C "$root" branch --show-current)" "$(git -c safe.directory="$root" -C "$root" remote get-url origin 2>/dev/null)"
  exit
done
exit 1`,
  });
  if (result.exitCode !== 0) return {};
  const [branch, remote] = result.stdout.split("\n");
  return {
    branch: branch || undefined,
    repository: parseGitHubRepository(remote)?.name,
  };
}

async function syncGit(_event: unknown, ctx: HookContext): Promise<void> {
  if (ctx.session.parent) return;
  const sessionId = getStringProperty(ctx.session.auth.initiator?.attributes, SESSION_ID_ATTRIBUTE);
  if (!isPublicId(sessionId)) return;

  try {
    const git = await getGitState(ctx);
    await getConvexClient().mutation(api.sessions.syncGit, { ...git, sessionId });
  } catch (error) {
    console.error("Could not synchronize Git state.", error);
  }
}

export default defineHook({
  events: {
    "session.completed": syncGit,
    "session.failed": syncGit,
    "session.waiting": syncGit,
  },
});
