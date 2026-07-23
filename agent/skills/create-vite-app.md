---
description: Create or initialize a Vite app in an empty workspace and make it accessible through the sandbox preview.
---

Inspect `/workspace` first. If a project exists, never reinitialize or overwrite it.

Honor the user's requested Vite template or framework. If none is specified, create a minimal
vanilla Vite 8 app. A scaffold command does not produce a sandbox-ready preview by itself.

Before calling `start_dev`, inspect and update `vite.config.js` or `vite.config.ts` so its
`server` configuration includes:

```js
server: {
  host: "0.0.0.0",
  allowedHosts: true,
  hmr: { protocol: "wss", clientPort: 443 },
},
```

Without `host` the Vercel Sandbox route cannot reach Vite. Without `allowedHosts` Vite rejects
the public sandbox hostname. Do not rely on CLI or framework defaults.

Use a private ESM `package.json` with pnpm and `dev`/`build` scripts. For the vanilla fallback,
create `index.html`, `src/main.ts`, and `src/style.css` with a minimal system-font starter.

Run `pnpm install`, call `start_dev` with `pnpm dev` on port 5173, and fix any public preview
error before continuing. Verify with `pnpm build` before finishing.
