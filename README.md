# eve-code

An open-source coding agent built with [eve](https://eve.dev) and Vercel Sandbox.

eve-code builds and runs apps from a chat. The agent writes code in an isolated
sandbox and serves it on a real dev server with its own URL; the app hot-reloads as
the conversation refines it. Projects are durable — conversation and filesystem
survive any amount of idle time.

> In design. The code arrives phase by phase — see [PLAN.md](./PLAN.md).

## Features

- **Live preview** — every project runs on a dev server with its own URL and
  hot-reloads on each change.
- **Persistent sandbox** — an isolated Linux VM per project; its filesystem
  survives idle-outs and redeploys.
- **Any code** — projects start from a Vite template; the agent can replace it with
  any framework, script, or API.
- **Shared terminal** — a shell into the same machine the agent works on.
- **Approvals** — destructive commands require confirmation before running.
- **Zip export** — the project's code can be downloaded at any time.

## Usage

```bash
bun install
bunx convex dev --once
bun run dev
```

Set `AI_GATEWAY_API_KEY` and `EVE_HOOK_SECRET` as described in `.env.example`.
`vercel deploy` ships both services; their wiring is declared in `vercel.json`.

## Development

eve runs the agent and its sandbox; Convex stores projects and conversations and
keeps every open window in sync; the UI is Vite + React. Everything deploys to
Vercel as two services.

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how it works and why it is shaped this way
- [AGENTS.md](./AGENTS.md) — the quality bar for any code written here
- [PLAN.md](./PLAN.md) — the phased path, one increment at a time

## License

[MIT](./LICENSE)
