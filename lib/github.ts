const segmentPattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;

export type GitRepository = {
  readonly name: string;
  readonly url: string;
};

function parsePath(path: string): GitRepository | undefined {
  const parts = path.replace(/^\/|\/$/g, "").split("/");
  if (parts.length !== 2) return;
  const owner = parts[0];
  const repository = parts[1]?.replace(/\.git$/, "");
  if (!owner || !repository) return;
  if (!segmentPattern.test(owner) || !segmentPattern.test(repository)) return;
  const name = `${owner}/${repository}`;
  return { name, url: `https://github.com/${name}.git` };
}

export function parseGitHubRepository(value: unknown): GitRepository | undefined {
  if (typeof value !== "string") return;
  if (value.length > 300) return;
  if (value.startsWith("git@github.com:")) return parsePath(value.slice(15));
  if (!value.includes("://")) return parsePath(value);

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "ssh:") return;
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return;
    if (url.port || url.search || url.hash) return;
    return parsePath(url.pathname);
  } catch {
    return;
  }
}
