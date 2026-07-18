# eve 0.24.6: working notes

Facts established by reading eve's source and bundled docs at the pinned version.
Check against the changelog when upgrading.

## Built-in tools

The default harness ships `bash`, `read_file`, `write_file`, `glob`, `grep` (all
rooted at `/workspace`), plus `web_fetch`, `todo`, `ask_question`, `load_skill`, and
`agent` (subagent delegation). `write_file` enforces read-before-write. There is no
built-in string-replacement edit tool — `edit_file` is ours.

## Overriding a built-in

A file at the same slug takes over the built-in. This is how `bash` gets an approval
policy:

```ts
// agent/tools/bash.ts
import { bash } from "eve/tools/defaults";
import { defineTool } from "eve/tools";

export default defineTool({
  ...bash,
  approval: (ctx) => isDestructive(ctx.toolInput) ? "user-approval" : "not-applicable",
});
```

Approval helpers from `eve/tools/approval`: `always()`, `once()`, `never()`. Custom
policies receive `{ session, toolName, toolInput, approvedTools, callId }` and may
return `"user-approval"`, `"not-applicable"`, `"approved"`, or `"denied"`. Gating a
side effect on approval also protects it from step replays.

## Sandbox definition

- `agent/sandbox/sandbox.ts` + seeded files under `agent/sandbox/workspace/`
  (mirrored into `/workspace`; top-level entries appear in the model's prompt).
- `bootstrap({ use })` is **template-scoped**: runs once at template build, its
  filesystem state is inherited by every session. Dependency installs go here. Set
  `revalidationKey` only for external inputs; authored source and seeds are tracked.
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

Eve owns the live turn. A hook on `turn.started` marks the chat running; hooks on
`session.completed` / `session.failed` / `session.waiting` replay the durable stream
from the last cursor via `eve/client` and commit one compact checkpoint to Convex.
The browser never finalizes persistence.
