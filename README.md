# eve-code

An open-source coding agent built to show how much [Eve](https://eve.dev) already
provides: durable sessions, sandboxed tools, streaming, and a persistent Vercel
Sandbox. Most of this repository is the product UI around those primitives.

Start a session, describe what you want, and watch the agent build it. The
conversation and filesystem survive idle time, and web apps run on a live URL with
hot reload.

## What works today

- Streaming, durable conversations backed by Convex checkpoints
- An empty persistent sandbox that can build any stack
- Visible reasoning, tool activity, diffs, and live command output
- Live preview with open, stop, resume, and restart controls
- A keyboard-accessible file tree and syntax-highlighted read-only viewer
- Optimistic session creation, plus session rename and deletion

The next phases add ZIP export, a shared terminal, and human approval for risky
commands. See [PLAN.md](./PLAN.md) for the full roadmap.

> eve-code is a demo, not a hosted multi-user product. It has no app-level
> authentication or session ownership. Keep deployments private unless you add
> those boundaries.

## Run locally

```bash
bun install
bunx vercel link
bunx vercel integration add convex
bunx vercel env pull .env.local
bun run dev
```

Set `AI_GATEWAY_API_KEY` only when Vercel OIDC is unavailable.

## Deploy

Push a branch or run `bunx vercel deploy`. The Convex integration supplies the
deploy keys; `vercel.json` deploys the Vite app and Eve service with an isolated
Convex deployment for each preview.

## Read more

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the system works and where Eve ends
- [AGENTS.md](./AGENTS.md) — the repository's minimalism and quality bar
- [PLAN.md](./PLAN.md) — completed phases and the remaining roadmap

## License

[MIT](./LICENSE)
