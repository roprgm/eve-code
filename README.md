# eve-code

An open-source coding agent built with [Eve](https://eve.dev) and Vercel Sandbox.

Eve Code is a compact starting point for building a browser-based coding agent. It
combines Eve's durable sessions and streaming with isolated Vercel Sandboxes,
Convex persistence, and a small web interface around the core coding loop. Web
projects run directly from the sandbox with a live preview and hot reload. The
codebase stays deliberately small so its model, instructions, tools, and interface
can be adapted to different use cases.

> Eve Code is a starting point, not a hosted multi-user product. Authentication,
> session ownership, and pull request workflows are out of scope. Keep deployments
> private until you add the necessary product boundaries.

## Features

- 🛠️ Build projects in an isolated, persistent Vercel Sandbox, starting from an
  empty workspace or a public GitHub repository.
- 💾 Conversations are durable and real-time: active turns stream from Eve, while
  completed turns synchronize through Convex.
- 👀 Reasoning and tool calls appear as individual activities, with elapsed time
  and live command output.
- 📝 File edits render as readable diffs with addition and deletion counts.
- 🌐 Run web projects on a live preview URL with hot reload, and restore the
  server after the sandbox goes idle.
- 🗂️ Navigate the workspace and inspect syntax-highlighted source files.

## How it works

The browser connects to an Eve channel, which runs one durable agent session in
its own persistent Vercel Sandbox. The agent uses Eve's file and search tools plus
small local adapters for interruptible commands, diff-producing edits, repository
cloning, and live previews. Eve streams its reasoning, messages, and tool activity
throughout the turn.

An Eve hook saves each completed turn to Convex, even if the browser disconnects.
While a turn is running, the browser follows Eve's live stream; when it finishes,
the Convex checkpoint becomes the durable history and synchronizes every open
client. The workspace browser, command logs, and preview controls all connect to
the same sandbox, so every surface reflects the environment the agent is using.

## Run locally

Install the dependencies and connect the project to Vercel and Convex:

```bash
bun install
bunx vercel link
bunx vercel integration add convex
bunx vercel env pull .env.local
bun run dev
```

Set `AI_GATEWAY_API_KEY` in `.env.local` only when Vercel OIDC is unavailable.

Open [http://localhost:5173](http://localhost:5173).

## Deploy

Push a branch or run `bunx vercel deploy`. The Convex integration provides the
deploy keys, and `vercel.json` deploys the Vite app and Eve service with an
isolated Convex deployment for each preview.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the system map, ownership boundaries,
and dependency rules.

## License

[MIT](./LICENSE)
