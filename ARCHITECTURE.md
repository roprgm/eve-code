# Architecture

> Living document. We iterate here before writing code.

A chat coding agent in the browser, in the spirit of Claude Code or Codex: you
create a project, and an agent builds whatever you ask for inside a live sandbox —
a web app you open in a new tab, a script, a server. You iterate by chatting, watch
it hot-reload, and download the result as a zip.

Three goals rank above any feature, in this order:

1. **Showcase Eve.** Demonstrate what [eve](https://eve.dev) can do. When Eve has a
   primitive — sandbox, tools, approvals, subagents — we use it the way Eve
   recommends, and write custom code only where Eve ends.
2. **Exemplary code.** Small files, one responsibility each, obvious to read. Whoever
   opens the repo should think "look how little it takes" (see AGENTS.md).
3. **Feel instant.** Local cache, optimistic navigation, streaming everywhere. The
   app should never feel like it is waiting for a server.

Few features executed exceptionally beat many features. Anything that does not serve
these three goals is a non-goal.

## Shape

```
Browser (Vite + React)
   │  durable turn stream
   ▼
Eve (Vercel service)
   │  session = one durable Eve session (one per project today)
   │  built-in sandbox tools ──▶ Vercel Sandbox (via Eve's sandbox, 1 per session)
   │                                │            │
   ▼ checkpoint hook                ▼            ▼
Convex (projects, sessions,     dev server    sandbox-server
        turns)                  (opens in     (terminal WS,
                                 a new tab)    zip export)
```

## Principles

1. **Eve first.** Between two designs, the one built on an Eve primitive wins, even if
   a custom version looks smaller. The framework is the product being shown.
2. **A session is a durable Eve session.** Ours and Eve's are deliberately the
   same concept — one durable session carries the conversation, the sandbox,
   per-session state, and turn serialization — no locks, no session bookkeeping of
   ours. A project groups sessions and owns what they share: the name and the
   preview. Today every project has exactly one session, created with it — the UI
   offers no way to add more, but nothing in the data assumes there is one.
3. **The sandbox is Eve's sandbox.** `defineSandbox` with the `vercel()` backend. The
   template is seeded files under `agent/sandbox/workspace/`; `bootstrap()` installs
   its dependencies once per template build, so every project starts warm, with a dev
   server one `spawn` away. The filesystem persists with the session. No sandbox
   lifecycle code of ours.
4. **The agent's hands are Eve's built-in tools.** `bash`, `read_file`, `write_file`,
   `glob`, `grep` come with the sandbox. We add only what is missing: `edit_file`
   (exact string replacement) and `start_dev` (spawn the dev server, publish its URL).
5. **The agent builds anything; the template is just a head start.** Every project
   starts from a minimal running Vite app so there is a preview from the first second,
   but the agent is unconstrained — it can grow it, replace it, or turn the project
   into a Python script or an API.
6. **Risky work pauses for a human.** Destructive or surprising commands go through
   Eve's human-in-the-loop approval: the run pauses, the chat asks with its
   input-request component, the session resumes.
7. **Done means reviewed.** A `reviewer` subagent checks the result — build passes,
   app responds — before the root agent declares a request finished. Delegation shown
   on a task that genuinely benefits from it.
8. **Seeing the result costs no UI.** Output lives in the chat stream and the shared
   terminal. When a port is exposed, an "Open app" button opens the real app in a new
   browser tab — full window, real URL, the dev server's own HMR. No iframes.
9. **Persistence is a hook, not the browser.** Eve owns the live turn; a hook
   replays the durable stream and commits one compact checkpoint per turn to Convex.
   Tool calls, approvals, and subagent activity travel in that same stream, so the
   UI shows everything with no extra channel.
10. **Human and agent share the shell.** The terminal connects to the same sandbox the
    agent works in, so either can pick up where the other left off.

## Data model

```
projects   name, previewUrl?, updatedAt
sessions   projectId, sessionId, eveSessionId, status, streamIndex,
           serverUrl?, serverToken?
turns      sessionId, events, searchText, streamIndex, usage
```

One session per project for now, created with the project — and still no turn
lock, because Eve serializes turns within a session. `sessionId` is our public id;
`eveSessionId` is Eve's durable session behind it. The split anticipates more
sessions without building them: the preview belongs to the project (one live app,
whichever sandbox serves it — today its only session's), while the terminal and
zip belong to the session whose sandbox they enter.

`usage` is what the turn cost — model tokens, and sandbox seconds once there is a
sandbox — written by the checkpoint hook. It is recorded for future analytics;
nothing reads it to limit anyone.

## Coding harness

Eve's built-ins are the base. What separates a correct agent from an efficient one
is a handful of small deltas, each a few lines:

- **`edit_file`** — exact string replacement via `ctx.getSandbox()`. Strict: the old
  string must match exactly once (fail loudly on zero or many matches), and the
  result echoes the changed region so the model sees what it did. Cheaper and safer
  than rewriting whole files.
- **`start_dev`** — ensure-style dev server plus published URL (see Sandbox server).
- **`bash` override** — one file, two jobs: the `approval` policy for destructive
  commands, and output shaping — long stdout/stderr truncated to a head+tail window
  with a byte cap, so one noisy command cannot flood the context.
- **Instructions** — the discipline that multiplies the tools: use the built-in
  `todo` list for multi-step work; verify before claiming done (build passes, dev
  server answers); prefer `edit_file` over rewrites; read before editing.

The template also seeds a short top-level `WORKSPACE.md` describing itself — Eve
surfaces top-level workspace entries in the model's prompt, so the agent starts
every session knowing what it is standing on, for free.

Nothing else. Planning modes, memory systems, and extra tools stay out unless a
phase proves the need.

## Sandbox server

One tiny server inside the sandbox, guarded by a random token. Spawned processes do
not survive a sandbox resume, so it is launched ensure-style — check, start if
missing — at each turn start:

```
Browser ── xterm.js ── wss://…/?token=… ──▶ pty (bash)
Browser ── GET https://…/zip?token=… ─────▶ zip of the workspace
```

A single small script (`sandbox-server.mjs`, node-pty + ws) seeded with the template.
Its dependencies install in `bootstrap()` — they never appear in this repo's
package.json.

The browser reaches both servers through the sandbox's per-port public URLs
(`https://….vercel.run`), which are stable across stop/resume. Two ports: dev server
+ sandbox-server. The exact mechanics — exposing ports, resolving URLs from Eve,
what survives a resume — are verified and written down in
[docs/sandbox.md](./docs/sandbox.md).

## Frontend

Design is deliberate and owner-controlled: one visual language, reused everywhere,
and every new surface passes design review before it lands (see AGENTS.md and the
plan's phase rules).

- **Home** — your projects, newest first, and a composer that creates one.
- **Project** — the conversation beside a workspace: Open app, Files (tree +
  read-only Shiki viewer; CodeMirror later), Terminal, Download zip. All workspace
  state is read reactively from the project and session documents in Convex.
- **Activity** — while the agent works, the conversation shows what it is doing as
  distinct activities sourced from the stream events — thinking, running a
  command, reading or editing a file — each with its elapsed time. A single
  generic "Thinking…" label only exists until tools do (phase 1).

Routes: `/` · `/p/:projectId`.

## Performance

Instant is a design constraint, and the stack already provides the machinery — the
work is refusing to bypass it:

- **Convex is the local cache.** `@convex-dev/react-query` keeps every query
  subscribed and warm; navigation renders from cache immediately and updates stream
  in. No fetch-on-navigate, no spinners over data we already have.
- **Optimistic creation.** Creating a project generates its public ID in the browser,
  renders the first message, and navigates to `/p/:id` before any server round
  trip. Eve and the sandbox warm up behind a UI that is already alive.
- **Streaming everywhere.** Turns render token by token from Eve's stream; workspace
  metadata (preview URL, status) arrives reactively from Convex the moment the agent
  publishes it.
- **Warm sandboxes.** `bootstrap()` bakes dependencies into the template build, so a
  new project's sandbox starts seeded and ready instead of running installs.
- **Lazy heavyweights.** xterm, Shiki, and later CodeMirror load with the tab that
  needs them, never with the conversation. The core bundle stays small because the dependency
  list stays small.

## Structure and layers

The map of the repo, and the rules that keep it clean. Dependencies point downward
only; importing from a higher layer is never the fix — move the code or the boundary
instead.

```
docs/           reference notes (sandbox.md, eve.md) — not code
agent/          the Eve agent (backend). Imports: lib, convex/_generated. Never UI.
  agent.ts  instructions.md
  channels/eve.ts  hooks/persist-session.ts
  sandbox/  sandbox.ts  workspace/        ← template + sandbox-server.mjs (seeded)
  subagents/  reviewer/
  tools/  bash.ts  edit-file.ts  start-dev.ts
convex/         data model and server functions. Imports: lib (pure logic only).
  schema.ts  projects.ts  persistence.ts
lib/            shared pure logic: identities, event shapes, stores, utilities.
                Runs in browser, agent, and Convex alike — so no React, no JSX,
                no component imports, no business UI. Imports: npm packages, lib.
components/
  ui/           generic primitives (button, dialog, …). Style-level only: no domain
                words, no Convex, no app state. Imports: react, lib/utils, ui.
  session/      feature components for the conversation.
  workspace/    feature components for the workspace panel.
                Feature components import: ui, lib, convex/_generated, siblings.
app/            routes, pages, and wiring (/  /p/:projectId). Imports anything
                below it. Nothing, anywhere, imports from app.
vercel.json     services: web + eve
```

Placement rules, by intent:

- General helper with no domain knowledge → `lib/` (or `lib/utils` if trivial).
- Reusable visual primitive → `components/ui/`. If it needs a domain concept to
  work, it is not a primitive — it belongs in the feature folder.
- Anything a feature owns (its components, its hook) → that feature's folder under
  `components/`.
- Logic shared between browser and agent (IDs, event parsing, checkpoint shapes) →
  `lib/`, and keep it dependency-light: this layer is why the two sides agree.
- New top-level folders need a reason this map lacks one.

Module design — how the map grows without rotting:

- **One module per concept, named after it**, kebab-case (`session-runtime.ts`,
  `use-session.ts`). A file that needs "and" to describe itself is two files.
- **Split on responsibility, not on size.** A long file with one job stays; a short
  file doing two jobs splits. Never split preemptively.
- **Extract on the second consumer, not before.** Code starts in the feature that
  owns it; it graduates to `lib/` or `components/ui/` when a second, real consumer
  appears. Speculative "shared" modules are how dead layers are born.
- **Import the module, not a barrel.** No `index.ts` re-exports — every import names
  the exact file it needs, so the dependency graph stays visible in the imports.
- **Hooks live with their feature** (`components/session/use-session.ts`), not in
  a global hooks folder.
- **In `convex/`, one file per resource** (`projects.ts`, `persistence.ts`),
  mutations and queries for that resource together.
- **Keep public surface minimal**: export what consumers use, nothing "just in
  case". Extending the system should mean adding a module that plugs into existing
  boundaries — if a change forces edits across many modules, the boundary is wrong;
  fix the boundary, then make the change.

## Dependencies

Inherited: eve, convex, react-query, React 19, react-router, Tailwind 4, shadcn,
streamdown, zustand, biome, bun, vitest.

New — kept deliberately short:

- `@vercel/sandbox` — one read-only `Sandbox.get(...).domain(port)` call in
  `start_dev` to resolve preview URLs; everything else goes through Eve's sandbox
- `@xterm/xterm` + `@xterm/addon-fit` — terminal client
- `shiki` — read-only file viewer (already transitive via streamdown)
- `@codemirror/*` — editing, later phase; chosen over Monaco for size and modularity

Deliberately avoided: Express/Hono (Eve is the backend), diff/patch libraries
(string-replace edits), direct LLM SDKs (Eve + AI Gateway), iframes (real tabs), log
panels (the terminal and the chat stream are the output).

## Upstream

This project doubles as a robustness test of Eve. When something cannot be done
idiomatically, the order of preference is: adjust our design, then flag it to the
owner if a simple upstream fix or improvement would make a real difference, and only
then build a local workaround — a patch is a last resort and a signal worth surfacing
either way. All upstream contact goes through the owner; the agent's job is to notice
and ask, never to reach out. During the early phases we do not block on upstream:
note the friction here, ship the phase within what Eve offers today, and revisit once
the core loop exists.

## Later

**Identity and cost.** How eve-code is offered — a hosted product behind a sign-in,
a repo anyone clones and runs with their own keys, or both — is a product decision
still being explored, and nothing here pre-commits to it. Today the app runs
without accounts: no auth, no quotas, no multi-user. The only provision is the
per-turn `usage` record (see Data model), so whichever model wins starts with real
numbers. Sign-in, ownership, and any enforcement are designed when that decision
lands, not before.

**Multiple sessions per project.** Verified feasible with today's platform
(docs/sandbox.md): every session keeps its own Eve sandbox, a project-level sandbox
runs the single preview, and local git moves the code between them — sessions
commit, the preview sandbox fetches and merges (~270 ms per delta), and a new
session starts
from the warm template plus one pull instead of a clone. No shared filesystem
exists on the platform, and none is needed: syncing at commit boundaries keeps the
one live reload coherent while several sessions work in parallel. This also sets up
local-first git — branches and experiments live only in the sandboxes, and GitHub
later becomes an optional remote pushed on request. The template gains `git init`
when this lands; until then the workspace has no repository at all. Open for that
phase: where the canonical repo lives (a project preview sandbox vs the first
session's), and the merge-conflict policy.

**GitHub.** Parked, designed: the sandbox gains `git` + `gh` in `bootstrap()` and a
user token via `onSession()` — Eve's credential brokering can keep it at the
firewall rather than in the sandbox. Cloning repos or opening PRs become plain
`bash` commands, and the local repo above gets its optional remote. It needs the
identity decision first, since a token implies a signed-in user.

## Investigation notes

The uncertain parts were verified before implementation — Eve 0.24.6 by source
reading, Vercel Sandbox by the Phase 0 spike. The findings that implementation relies on
live in [docs/sandbox.md](./docs/sandbox.md) (ports, URLs, resume semantics,
ensure-style servers) and [docs/eve.md](./docs/eve.md) (built-in tools, overrides
and approvals, sandbox definition, channel auth, custom channels).

## Open questions

- File tree freshness: refetch after each turn (v1) vs a watcher in the sandbox.
