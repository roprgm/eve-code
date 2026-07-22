# Architecture

> Living document. Unless a section is marked **Planned**, it describes the
> implementation at the end of Phase 4.

eve-code is a browser coding agent in the spirit of Claude Code or Codex. A user
starts a session, asks an agent to build something, and watches it work inside a
live sandbox.

Three goals rank above every feature:

1. **Showcase Eve.** Use Eve's sessions, sandbox, tools, stream, and hooks. Custom
   code starts where those primitives end.
2. **Stay exemplary and small.** Whoever opens the repository should think “look
   how little it takes.” Clarity is part of the product.
3. **Feel instant.** Render cached state, navigate optimistically, stream work, and
   lazy-load heavy UI.

Few features executed well beat many features.

## Current shape

```text
Browser (Vite + React)
   │ turns and durable event stream
   ▼
Eve service ───────────────────────▶ Vercel Sandbox
   │ one durable Eve session              │ persistent /workspace
   │ per conversation                      └─ dev server ──▶ Preview URL
   │ checkpoint hook
   ▼
Convex (sessions, turns) ──▶ subscribed browser cache

Browser ── workspace and preview HTTP ──▶ Eve channels ──▶ same sandbox
```

The HTTP channels are narrow product adapters. Eve still creates the session and
sandbox, runs the agent, serializes turns, and owns the durable event stream.

## Current principles

1. **Eve first.** A design built on an Eve primitive wins over a parallel local
   framework.
2. **The session is the unit of work.** It carries conversation state, the sandbox,
   and turn serialization. There is no separate project model until Git-backed
   repositories provide a real reason to group sessions.
3. **The workspace starts empty.** `agent/sandbox.ts` selects Eve's Vercel backend.
   No framework or seed is installed until the task needs one; optional Eve skills
   provide stack recipes.
4. **The agent starts with Eve's hands.** `read_file`, `glob`, `grep`, and the other
   built-ins remain framework tools. Narrow local adapters add complete-write diffs,
   exact edits, preview startup, and the Bash gaps described below.
5. **Persistence follows Eve.** The browser consumes the live stream. An Eve hook
   replays each completed turn and commits one compact checkpoint to Convex; the
   browser is never the source of completed-turn truth.
6. **Work stays visible.** Reasoning, tool calls, elapsed time, diffs, and command
   output appear in the conversation. Preview opens the real server URL in a new
   tab; there is no iframe or duplicate log panel.
7. **The demo has no application identity.** Convex operations and product channels
   do not enforce user ownership. Deployments stay private until authentication,
   ownership, and cost policy are designed.

Approvals, the reviewer subagent, ZIP export, the shared terminal, and human file
editing are planned features, not current architecture.

## Data model

```text
sessions   sessionId, eveSessionId?, name, continuationToken?,
           status { ready | running | stopping | error }, streamIndex, updatedAt
turns      sessionId, turnId, events, searchText, streamIndex,
           usage { inputTokens, outputTokens }
```

`sessionId` is the app's public route identifier. `eveSessionId` identifies Eve's
durable runtime behind it. The browser creates the public session immediately; Eve
fills its runtime identity and continuation state when the first turn runs.

Eve serializes turns, so there is no application turn lock. The checkpoint hook
stores each turn once at a stream boundary. Preview results, tool calls, and activity
remain in Eve's events instead of becoming parallel Convex records. Token usage is
recorded for future product decisions but does not enforce a product quota; Eve's
per-session safety limits still apply.

## Coding harness

Eve's built-ins are the base. The local additions are deliberately narrow:

- **`bash`** reuses Eve's built-in contract and replaces only its executor. It runs
  a detached Vercel Sandbox command, waits with the turn's abort signal, kills the
  command on interruption, returns the tail of bounded stdout/stderr, and exposes
  live logs to the active tool activity.
- **`write_file`** preserves Eve's create/overwrite contract and read-before-write
  protection, adding a bounded diff for complete replacements.
- **`edit_file`** applies batched, exact, unique, non-overlapping replacements to one
  snapshot and stores a context-limited unified diff.
- **`start_dev`** starts the model-selected server command, exposes its port, and
  returns the sandbox ID and public URL.
- **Instructions** require reading before editing, finite Bash commands, `start_dev`
  for long-lived servers, and a build or test before claiming success.

Planning modes, memory systems, and extra orchestration stay out until a phase proves
their value.

## Framework edges and workarounds

The demo keeps each Eve workaround at one boundary. Upstream-facing candidates are
tracked in [docs/eve-improvements.md](./docs/eve-improvements.md).

- Eve 0.24.6 does not propagate cancellation through the built-in Bash wait. The
  local `bash` adapter binds the abort signal and kills the Vercel command so Stop can
  settle the turn.
- Eve can still fail to emit a boundary after cancellation. Stop records a durable
  `stopping` state; Convex releases it as an error after 20 seconds unless a normal
  checkpoint settles it first. An explicit retry clears that error before Eve starts.
- The built-in Bash result arrives after completion. The workspace channel follows
  the active Vercel command's log stream so the conversation can render output while
  it runs.
- Eve's sandbox handle does not expose ports, public URLs, status, stop, or resume.
  `start_dev` and the preview-control channel look up the same sandbox through
  `@vercel/sandbox` only for those operations.
- Sandbox files survive stop and resume; processes do not. Preview therefore stores
  the latest `start_dev` command in Eve's stream and reruns it when the user resumes
  the preview.
- Eve has no browser workspace API. A read-only channel lists files and reads one
  file from `/workspace`; it rejects path traversal and symlink escapes, prunes
  generated directories, caps the tree at 10,000 paths, and refuses binary or text
  files over 200 KiB.

The current workspace routes are:

```text
GET /eve/v1/workspace/:sessionId
GET /eve/v1/workspace/:sessionId/file?path=...
GET /eve/v1/workspace/:sessionId/command
```

Here `sessionId` is Eve's durable session ID, not the app's public session ID.

## Frontend

- **Home** starts a session optimistically from the composer; the sidebar lists
  sessions newest first.
- **Session** renders the durable conversation, Preview control, and a Files toggle.
  The read-only workspace contains breadcrumbs, a keyboard-accessible tree, and a
  highlighted source viewer. File tool activity can open the corresponding file.
- **Activity** projects Eve events into reasoning, tool calls, live Bash output,
  file diffs, and elapsed time.
- **Session management** includes responsive sidebar navigation, rename, and delete.

The tree refetches after the next Convex checkpoint changes the session stream index.
It intentionally has no watcher yet. Routes are `/` and `/s/:sessionId`.

## Performance

- **Convex is the local cache.** Convex subscriptions feed TanStack Query with an
  infinite stale time; navigation renders cached data and receives updates in place.
- **Creation is optimistic.** The browser creates public IDs, renders the first
  message, and navigates before the session mutation and first Eve turn settle.
- **The live path stays live.** Eve streams turns; the workspace channel separately
  streams the active Bash command.
- **Heavy UI is lazy.** File diffs load their renderer only when a diff appears. The
  workspace panel loads on the first Files open and remains mounted while hidden;
  Pierre and Shiki are absent from the initial route and language grammars load on
  demand.
- **Shiki is bounded.** Vite aliases Pierre's generic Shiki entry points to the small
  supported-language map and one dark theme instead of bundling every grammar,
  theme, and WASM engine.
- **Cached workspace data remains visible.** A refresh keeps the last tree or file
  until its replacement arrives.

The Phase 4 bundle check is an initial-path budget, not a promise of zero growth.
Its measured result is recorded in [PLAN.md](./PLAN.md).

## Structure and layers

Dependencies point downward. If a lower layer needs a higher one, move the concern
instead of bending the rule.

```text
docs/           platform research and upstream notes
agent/          Eve agent and its server-side adapters
  agent.ts  sandbox.ts  bash-command.ts  file-edit.ts  workspace-files.ts  instructions.md
  channels/     Eve transport, preview control, read-only workspace and logs
  hooks/        turn checkpoint persistence
  skills/       optional stack recipes
  tools/        bash.ts  write_file.ts  edit_file.ts  start_dev.ts
convex/         schema, session operations, and checkpoint persistence
lib/            lowest-level non-component modules and runtime/vendor adapters
components/
  ui/           generic visual primitives
  code/         Pierre-backed source and diff facades
  session/      conversation, activity, navigation, and preview control
  workspace/    file navigation, tree, queries, and panel
app/            routes, pages, providers, and top-level wiring
tests/          pure contract and runtime tests
vercel.json     Vite web service plus Eve service
```

Layer rules:

- `agent/` imports low-level `lib/` contracts and generated Convex APIs, never UI.
- `convex/` imports only pure `lib/` modules.
- `lib/` never imports feature components, `app/`, `agent/`, or `convex/`. A module
  may be cross-runtime or browser-only, but its dependencies must make that boundary
  obvious.
- Feature components may import `ui/`, `lib/`, generated Convex APIs, and sibling or
  lower feature facades. `app/` wires them together; nothing imports from `app/`.
- Vendor renderers stay behind `components/code/` or the workspace feature boundary.
  Consumers do not depend on Pierre directly.
- There are no barrel files. Modules export only what a real consumer uses.
- Split on responsibility, not line count. Extract shared code on its second real
  consumer, not in anticipation of one.

## Current dependencies

The runtime remains intentionally short:

- `eve`, `@vercel/sandbox`, and `@vercel/oidc` for the agent and sandbox
- `convex`, `@convex-dev/react-query`, and TanStack Query for durable reactive data
- React 19, React Router, and Zustand for the browser runtime
- Tailwind 4, `@shadcn/react`, Lucide, and Streamdown for the interface
- `@pierre/diffs`, `@pierre/trees`, `diff`, and Pierre's transitive Shiki runtime for
  source, diff, and tree rendering
- Zod for HTTP boundary validation

xterm and CodeMirror are not installed; their planned phases must earn those
dependencies. The repository also avoids a parallel HTTP framework, direct LLM SDKs,
and iframe preview infrastructure because Eve and the platform already provide the
needed boundaries.

## Planned: sandbox server

Phases 5 and 6 add one small token-guarded server inside the existing sandbox:

```text
Browser ── GET https://…/zip?token=… ─────▶ ZIP of /workspace
Browser ── xterm.js ── wss://…/?token=… ──▶ pty (bash)
```

Its server-only packages live inside the sandbox, not this repository's dependency
list. It must be recreated after a sandbox resume because processes are ephemeral.
The verified port, URL, WebSocket, and resume mechanics live in
[docs/sandbox.md](./docs/sandbox.md).

## Planned: later phases

- **Phase 5:** ZIP export.
- **Phase 6:** a terminal sharing the agent's sandbox.
- **Phase 7:** Eve human-in-the-loop approval for risky Bash commands.
- **Phase 8:** a reviewer subagent for build and runtime verification.
- **Phase 9:** human editing with lazy CodeMirror.
- **Later:** identity and cost policy, Git-backed repositories that can group
  sessions, GitHub as an optional remote, more stack skills, and evals.

Cross-session work has been verified as feasible with one sandbox per session and
local Git synchronization; the research is in [docs/sandbox.md](./docs/sandbox.md).
No current code models a repository or groups sessions.

## Upstream and investigation notes

When Eve lacks a needed primitive, keep the local adapter small, document why it
exists, and remove it when Eve gains the capability. Upstream contact goes through
the owner.

Implementation assumptions were checked against Eve 0.24.6 source and the Phase 0
Vercel Sandbox spike. See [docs/eve.md](./docs/eve.md),
[docs/sandbox.md](./docs/sandbox.md), and
[docs/eve-improvements.md](./docs/eve-improvements.md).

## Open questions

- Whether eve-code is ultimately a private hosted product, a self-hosted demo using
  the operator's keys, or both. Authentication, ownership, quotas, and public access
  wait on that answer.
- For Git-backed repositories: where the canonical checkout lives and how merge
  conflicts are surfaced when sessions are grouped.

File-tree freshness is resolved for the current phase: refetch after each committed
turn. A filesystem watcher is considered only if measurement proves that insufficient.
