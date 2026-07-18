# Plan

> Living document. The work is split into micro-phases: vertical increments sized so
> one implementing agent can complete one phase in one focused session.

Rules for every phase:

- Read AGENTS.md and the ARCHITECTURE.md sections and docs/ files the phase
  references. They are the spec; the phase brief only says what is in and out.
- The app must work end to end when the phase lands — no half-wired states.
- Fold discoveries back into ARCHITECTURE.md (or docs/) when reality disagrees
  with them.
- The deployment stays private (unlisted). Opening it to others waits on the
  identity-and-cost decision (see ARCHITECTURE.md's Later) — it is not a phase.
- **Design review gates every visible change.** A phase that adds or alters UI is not
  done until the owner has seen it — screenshots of every new surface and state
  (light and dark) plus the preview URL — and approved it. Iterate on the feedback
  inside the phase; design polish is never deferred to a follow-up.
- If Eve itself is the blocker, do not patch it or work around it in early phases:
  record the friction in ARCHITECTURE.md's Upstream section, deliver the phase within
  what Eve offers, and ask the owner when a small Eve change would make a real
  difference — upstream contact is the owner's call, never the agent's.

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
- **Reads:** Principles, Sandbox server, docs/sandbox.md, Open questions.
- **Status: done.** Findings recorded in docs/sandbox.md —
  ports, URLs, and WebSockets work; the filesystem survives resume but spawned
  processes do not, so server starts are ensure-style. One caveat: in-browser HMR
  is verified visually at Phase 3's design review.

### Phase 1 — Chat skeleton

- **Goal:** the eve-vite-convex anatomy, retargeted to projects.
- **Scope:** chat UI with streaming turns, checkpoint persistence via the Eve hook,
  data model `projects`, `chats`, and `turns` — creating a project creates its one
  chat with it — routes `/` and `/p/:projectId` (the project page opens its chat),
  optimistic creation with client-generated IDs. No sandbox.
- **Out of scope:** sandbox, tools, workspace UI, auth, any way to add a second
  chat.
- **Done when:** deployed; a conversation streams live, survives reload from Convex,
  and creating a project navigates instantly.
- **Reads:** Principles 1-2 and 9, Data model, Frontend, Performance.

### Phase 2 — Sandbox and built-in tools

- **Goal:** the agent gets hands.
- **Scope:** `agent/sandbox/` with the seeded Vite template (including a short
  `WORKSPACE.md` self-description) and `bootstrap()` installing its dependencies;
  agent works through Eve's built-in `bash`, `read_file`, `write_file`, `glob`,
  `grep`; `bash` override shaping long output (head+tail, byte cap);
  `instructions.md` with the harness discipline (todo list, verify before done,
  read before edit); tool activity rendered in the chat stream.
- **Out of scope:** custom tools, preview, any workspace UI.
- **Done when:** "add a file explaining this project" results in a file the agent can
  `bash cat` back, in a fresh turn, after a reload.
- **Reads:** Principles 3-5, Coding harness, docs/eve.md (sandbox definition).

### Phase 3 — Custom tools and preview

- **Goal:** see the app live.
- **Scope:** `edit_file` (strict single-match string replacement, echoes the
  changed region) and `start_dev` (ensure-style dev server, publishes its URL to
  Convex) in `agent/tools/`; Open-app button on the project page, shown only when a
  URL exists.
- **Out of scope:** file tree, terminal, zip.
- **Done when:** "build a landing page with a counter" ends with the button opening
  the app in a new tab, and a follow-up request hot-reloads it.
- **Reads:** Principles 5 and 8, Coding harness, docs/sandbox.md (URL resolution).

### Phase 4 — Zip download

- **Goal:** take your code home.
- **Scope:** the sandbox-server seeded with the template, serving the zip route with
  its handshake token; Download button on the project page.
- **Out of scope:** the pty/terminal half of sandbox-server.
- **Done when:** the downloaded zip unpacks into the working project, excluding
  node_modules.
- **Reads:** Sandbox server, Principle 8, docs/sandbox.md.

## Workspace

### Phase 5 — Files tab

- **Goal:** watch the agent's work.
- **Scope:** workspace panel beside the chat; file tree + read-only Shiki viewer,
  lazy-loaded, refreshed after each turn.
- **Out of scope:** editing, terminal.
- **Done when:** files the agent just wrote are browsable with highlighting, and the
  chat bundle did not grow.
- **Reads:** Frontend, Performance (lazy heavyweights).

### Phase 6 — Terminal

- **Goal:** a shell into the same sandbox.
- **Scope:** pty support in sandbox-server; Terminal tab with xterm over WebSocket,
  token-guarded, lazy-loaded.
- **Out of scope:** multiple terminals, persistence of scrollback.
- **Done when:** you can `ls` the files the agent created and touch a file the agent
  can then read.
- **Reads:** Sandbox server, Principle 10, docs/sandbox.md.

## Eve in depth

### Phase 7 — Human-in-the-loop

- **Goal:** risky commands ask first.
- **Scope:** the `approval` policy added to the existing `bash` override;
  approve/deny UI in the chat (inherited input-request pattern); policy for what
  needs approval written in instructions.
- **Out of scope:** per-user policies.
- **Done when:** "delete everything and start over" pauses for approval; denying it
  leaves the project intact.
- **Reads:** Principle 6, docs/eve.md (overrides and approvals).

### Phase 8 — Reviewer subagent

- **Goal:** show delegation where it earns its place.
- **Scope:** `agent/subagents/reviewer/` verifying build and running app before the
  root agent declares a request done; its activity visible in the stream.
- **Done when:** a request that produces a broken build gets caught and fixed before
  the agent reports success.
- **Reads:** Principle 7.

## Beyond

### Phase 9 — Human editing

- **Goal:** human and agent edit interchangeably.
- **Scope:** CodeMirror replacing the read-only viewer, lazy-loaded; save uses the
  same write path as the agent; `edit_file` calls rendered as diffs in the chat.
- **Done when:** a human edit hot-reloads the preview, and the agent's next edit
  builds on it.
- **Reads:** Frontend, Performance, Dependencies.

## Later

- Identity and cost: whether eve-code runs hosted behind a sign-in or self-hosted
  from the repo is an open product decision (see ARCHITECTURE.md's Later). Sign-in,
  ownership, quotas, and opening the deployment to the public all wait on it; the
  per-turn usage record already feeds it with real numbers.
- GitHub integration: `git` + `gh` in `bootstrap()`, a user token brokered via
  `onSession()`, PRs as plain commands. Also waits on identity.
- Multiple chats per project: one Eve sandbox per chat, a project preview sandbox,
  local git syncing commits between them. Verified feasible — the mechanics are in
  docs/sandbox.md and the design in ARCHITECTURE.md's Later.
- Skills per stack (vite-app, python-script, api-server) when instructions outgrow
  one file; Eve evals in CI.
- BYO API key for heavy users; sandbox idle auto-stop tuning if compute dominates.
