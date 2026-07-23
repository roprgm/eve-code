# Plan

> Living document. The work is split into micro-phases: vertical increments sized so
> one implementing agent can complete one phase in one focused session.

**Current milestone: Phase 5.**

Rules for every phase:

- Read AGENTS.md and the ARCHITECTURE.md sections and docs/ files the phase
  references. They are the spec; the phase brief only says what is in and out.
- The app must work end to end when the phase lands — no half-wired states.
- Fold discoveries back into ARCHITECTURE.md (or docs/) when reality disagrees
  with them.
- The deployment stays private (unlisted). Opening it to others waits on the
  identity-and-cost decision (see ARCHITECTURE.md's Open questions) — it is not a
  phase.
- **Design review gates every visible change.** A phase that adds or alters UI is not
  done until the owner has seen it — screenshots of every new surface and state plus
  the preview URL — and approved it. Iterate on the feedback
  inside the phase; design polish is never deferred to a follow-up.
- If Eve itself is the blocker, record the friction before adding code. Prefer an
  Eve primitive; when the product needs a local adapter, keep it narrow, document
  its removal path, and let the owner decide any upstream contact.

## Core loop

### Phase 0 — Sandbox spike

Throwaway code; the deliverable is answers written into the docs.

- **Goal:** confirm at runtime what source reading already established (see
  docs/eve.md).
- **Scope:** scratch scripts against real Vercel sandboxes. Confirm: exposed ports
  and URL resolution; Vite dev server and WebSockets through the `vercel.run` URL;
  whether spawned processes survive an idle-out resume.
- **Out of scope:** anything reusable; this code is deleted.
- **Done when:** the remaining sandbox items disappear from ARCHITECTURE.md's open
  questions, replaced by confirmed mechanisms.
- **Reads:** Current shape, docs/sandbox.md, Open questions.
- **Status: done.** Findings recorded in docs/sandbox.md —
  ports, URLs, and WebSockets work; the filesystem survives resume but spawned
  processes do not, so `start_dev` must be called again after resume. One caveat: in-browser HMR
  is verified visually at Phase 3's design review.

### Phase 1 — Session skeleton

- **Goal:** the eve-vite-convex anatomy centered on Eve sessions.
- **Scope:** conversation UI with streaming turns, checkpoint persistence via the
  Eve hook, data model `sessions` and `turns`, routes `/` and `/s/:sessionId`, and
  optimistic creation with a client-generated ID. No sandbox.
- **Out of scope:** sandbox, tools, workspace UI, auth, any way to add a second
  session.
- **Done when:** deployed; a conversation streams live, survives reload from Convex,
  and creating a session navigates instantly.
- **Reads:** Current principles 1, 2, and 5; Data model; Frontend; Performance.
- **Status: done.** Deployed privately (Vercel Authentication; the public
  production domain is removed) with Convex provisioned through Vercel's native
  integration and the Convex URL injected into both service builds by
  `convex deploy --cmd`. The frontend binding question resolved
  to the session runtime — checkpoint persistence needs it. Design reviewed and
  approved by the owner, including mobile.

### Phase 2 — Sandbox and built-in tools

- **Goal:** the agent gets hands.
- **Scope:** `agent/sandbox.ts` selects Eve's Vercel backend and leaves `/workspace`
  empty; optional skills can initialize a selected stack; the agent works through Eve's
  built-in `bash`, `read_file`, `write_file`, `glob`, `grep`; `instructions.md` carries
  the harness discipline; the conversation renders each tool call and thinking span
  as a distinct timed activity (see Frontend, Activity).
- **Out of scope:** custom tools, preview, any workspace UI.
- **Done when:** "add a file explaining this project" results in a file the agent can
  `bash cat` back, in a fresh turn, after a reload.
- **Reads:** Current principles 1, 3, 4, and 6; Coding harness; docs/eve.md
  (sandbox definition).
- **Status: done.** Empty persistent sandbox (`vercel()` backend), optional stack
  skills, harness instructions, and the expandable activity stream with distinct
  timed reasoning and tool calls are in place.

### Phase 3 — Custom tools and preview

- **Goal:** see the app live.
- **Scope:** `edit_file` makes batched exact replacements and returns a unified diff;
  `start_dev` runs the model-selected command, exposes its port, and returns its sandbox
  ID and URL; Preview reads the latest result, polls its state, and can stop or restart
  that command. The local `bash` adapter runs a detached command, waits with the turn's
  abort signal, kills it on Stop, bounds its final output, and streams live logs into
  the active tool activity. The desktop session sidebar can collapse to keep the
  header usable.
- **Out of scope:** general process supervision, restoring other processes, sandbox
  cleanup, approvals, file tree, terminal, or workspace archive.
- **Done when:** new and existing sessions keep Preview available; it opens in a new tab,
  follows a replacement sandbox, can stop or restart after idle, and stopping a turn
  kills its active Bash command.
- **Reads:** Current principles, Coding harness, Framework edges and workarounds,
  docs/sandbox.md (URL resolution).
- **Status: done.** Exact editing, lazy diff rendering, live Preview controls,
  interruptible Bash, and live command output all work against the same Eve sandbox.

## Workspace

### Phase 4 — File tree and viewer

- **Goal:** watch the agent's work.
- **Scope:** a read-only Eve route lists workspace paths and reads one selected text
  file; a right-side workspace panel renders a file tree and syntax-highlighted
  read-only viewer with the full path at the top. The panel is lazy-loaded and the
  tree refreshes after each committed turn.
- **Out of scope:** editing, rename, drag and drop, Git status, terminal, workspace
  archive,
  resizable panels.
- **Done when:** a file the agent just wrote appears after the turn, selecting it
  opens the highlighted contents with its full path, keyboard tree navigation works,
  and the renderer stays off the initial path within the measured bundle budget.
- **Reads:** Frontend, Performance (lazy heavyweights), docs/sandbox.md.
- **Status: done.** Design reviewed and approved. The tree refreshes
  from the committed stream index, activity links open files, and binary, missing,
  oversized, and unsafe paths are handled. With the same `node_modules`, the
  isolated viewer commit (`9174af1`) moved initial JavaScript
  from about 213.25 KiB to 214.55 KiB gzip versus `main`: about +1.30 KiB. Pierre and
  Shiki remain in lazy chunks. This comparison isolates the viewer change; later Bash
  work is not attributed to Phase 4.

## Workspace portability

### Phase 5 — Workspace download

- **Goal:** take your code home.
- **Scope:** an Eve workspace route creates a temporary archive inside the sandbox,
  returns it to the browser, and powers a Download action on the session page.
- **Out of scope:** a persistent sandbox server, terminal, and stored archives.
- **Done when:** the downloaded archive unpacks into the current workspace contents with
  every `node_modules` directory excluded, without breaking Preview.
- **Reads:** Planned: workspace export, Current principles 1 and 6, docs/sandbox.md.
- **Status: in progress.** Implementation and automated verification are complete;
  design review remains.

## Repositories and delegation

### Phase 6 — Git-backed repositories

- **Goal:** make a real repository the durable project boundary.
- **Scope:** associate sessions with a repository, keep one sandbox per session, and
  synchronize work through Git commits; broker remote credentials through Eve's
  session boundary when a GitHub remote is used.
- **Out of scope:** general multi-user permissions, pull-request UI, and background
  bidirectional sync.
- **Done when:** two sessions for one repository can exchange a commit without a
  shared filesystem, and a resumed session keeps working from its repository state.
- **Reads:** Data model, Open questions, docs/sandbox.md (Git between sandboxes).

### Phase 7 — Reviewer subagent

- **Goal:** show delegation where it earns its place.
- **Scope:** `agent/subagents/reviewer/` checks out the commit under review in its own
  sandbox, verifies the build and running app, and reports findings before the root
  agent declares success; its activity is visible in the stream.
- **Done when:** a request that produces a broken build gets caught and fixed before
  the agent reports success.
- **Reads:** Current principles 1 and 6, Phase 6, Eve subagent docs.

## Beyond

### Phase 8 — Human editing

- **Goal:** human and agent edit interchangeably.
- **Scope:** CodeMirror replacing the read-only viewer, lazy-loaded; save uses the
  same write path as the agent; build on the existing `edit_file` diff rendering.
- **Done when:** a human edit hot-reloads the preview, and the agent's next edit
  builds on it.
- **Reads:** Frontend, Performance, Current dependencies and file-diff rendering.

## Later

- Identity and cost: whether eve-code runs hosted behind a sign-in or self-hosted
  from the repo is an open product decision (see ARCHITECTURE.md's Open questions).
  Sign-in, ownership, quotas, and opening the deployment to the public all wait on
  it; the per-turn usage record already feeds it with real numbers.
- Terminal: reconsider only if direct human shell access proves worth a token-guarded
  PTY server, WebSocket transport, xterm, and their security surface. Agent Bash and
  live command output already cover the demo's core execution story.
- Approvals: add Eve human-in-the-loop policy when Git credentials or other external
  side effects make confirmation materially useful; sandbox-only Bash does not need
  the ceremony.
- More independent stack skills (Next.js, Express, Python) as demand proves them;
  Eve evals in CI.
- BYO API key for heavy users; sandbox idle auto-stop tuning if compute dominates.
