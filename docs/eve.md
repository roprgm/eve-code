# eve 0.24.6: working notes

Facts established by reading eve's source and bundled docs at the pinned version.
Check against the changelog when upgrading.

## Built-in tools

The default harness ships `bash`, `read_file`, `write_file`, `glob`, `grep` (all
rooted at `/workspace`), plus `web_fetch`, `todo`, `ask_question`, `load_skill`, and
`agent` (subagent delegation). `write_file` enforces read-before-write. There is no
built-in string-replacement edit tool — `edit_file` is ours.

`write_file` preserves Eve's overwrite safeguards and stores a diff for replacements.
`edit_file` batches unique, non-overlapping replacements against one file snapshot.
Both serialize mutations per file and keep their UI diffs bounded.

## Overriding a built-in

A file at the same slug takes over the built-in. The local `bash` and `write_file`
tools spread Eve's definitions and replace only the behavior the product needs.
Approval policies can be added independently in Phase 7 with the helpers from
`eve/tools/approval`: `always()`, `once()`, and `never()`.

## Sandbox definition

- `agent/sandbox.ts` is Eve's definition-only layout. This project only selects
  `vercel()`, so `/workspace` starts empty and no template prewarm runs.
- Framework setup belongs in load-on-demand skills after the stack is selected.
  Skills live outside `/workspace` and add instructions, not execution surfaces.
- `onSession({ use, ctx })` is **session-scoped**: runs once per durable session
  (again only if the sandbox definition changes). `use(opts)` flows to the backend's
  update path — this is where per-session `ports`, resources, network policy, and
  credentials go. It can read `ctx.session` for the current principal.
- Sandboxes always boot from eve's published image; `runtime` is not configurable.
- Network policy: `"allow-all"` (default), `"deny-all"`, or an allowlist. `vercel()`
  and `microsandbox()` support domain-level rules and credential brokering
  (`transform` injects headers at the firewall; secrets never enter the sandbox).

## Channel auth

- The eve channel takes an ordered auth walk: `auth: [a(), b(), c()]`. Entries that
  don't recognize the caller return `null`; eve fails closed if nothing matches.
- Verifier helpers: `vercelOidc()`, `localDev()`, `none()`, `jwtHmac(...)`,
  `jwtEcdsa(...)`, `oidc(issuer)`. Custom `AuthFn` entries are first-class — a
  Convex-issued user JWT is verified here.
- `onMessage(ctx)` sees request headers and returns `{ auth }` with attributes;
  attributes are readable in hooks and approval policies via
  `ctx.session.auth.current` / `.initiator`.

## Custom channels

`defineChannel` supports HTTP routes and `WS()` WebSocket routes with the same
helpers (`send`, `getSession`, `receive`, ...). This is the fallback proxy path for
the terminal if direct browser-to-sandbox WebSockets ever misbehave.

## Persistence pattern

Eve owns the live turn. Before a retry, the browser clears the recoverable error;
`turn.started` then attaches Eve's identity and marks a ready session running. Hooks
on `session.completed` / `session.failed` / `session.waiting` replay the durable
stream from the last cursor via `eve/client` and commit one compact checkpoint to
Convex. The browser never finalizes persistence. Authentication is deferred until
the app has user accounts; these Convex functions are public during the demo phase.
