import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("VITE_CONVEX_URL is not set.");

const functions = ".vercel/output/functions";
const configs = (await readdir(functions, { recursive: true })).filter((path) =>
  path.endsWith(".vc-config.json"),
);
if (!configs.length) throw new Error("Eve build produced no Vercel functions.");

for (const relativePath of configs) {
  const path = join(functions, relativePath);
  const config = JSON.parse(await readFile(path, "utf8"));
  const environment = { ...config.environment, VITE_CONVEX_URL: convexUrl };
  await writeFile(path, `${JSON.stringify({ ...config, environment }, null, 2)}\n`);
}
