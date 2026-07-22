---
description: Create a minimal vanilla Vite app in an empty workspace, configured for the sandbox preview.
---

Inspect `/workspace` first. If a project exists, never reinitialize or overwrite it.

For an empty workspace, create a minimal vanilla Vite 8 app with:

- A private ESM `package.json` using pnpm, `vite` as a dev dependency, and `dev`/`build` scripts.
- `vite.config.js` with `host: true`, `allowedHosts: true`, and `hmr: { protocol: "wss", clientPort: 443 }`.
- `index.html` loading `/src/main.js` into `#app`.
- `src/main.js` importing `src/style.css` and rendering “Ready to build” with a short prompt to describe the app.
- Minimal system-font CSS that supports light/dark color schemes and centers the page.

Run `pnpm install`, call `start_dev` with `pnpm dev` on port 5173, then verify with `pnpm build`.
