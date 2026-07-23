# Vercel Sandbox: verified mechanics

Facts established by the Phase 0 spike against real sandboxes (team-scoped access
token, `@vercel/sandbox` SDK). Implementation should rely on these without
re-deriving them.

## Ports and public URLs

```ts
const sandbox = await Sandbox.create({ ports: [3000, 3001], ... });
sandbox.domain(3000); // "https://sb-<subdomain>.vercel.run"
```

- Up to 4 ports per sandbox. Each port gets its own opaque subdomain.
- `domain(port)` throws for ports not in the create/update config.
- Ports can also be added later with `sandbox.update({ ports })`. `start_dev` uses
  this to expose the port selected by the model before it launches the server.
- **URLs are stable across stop/resume.** Safe to persist in Convex.

## Resolving the URL from Eve

Eve's `SandboxSession` handle exposes no routes. The Vercel backend names each
sandbox with Eve's session key, surfaced as `SandboxSession.id`, and the SDK
supports lookup by name:

```ts
const eveSandbox = await ctx.getSandbox();
const vercelSandbox = await Sandbox.get({ name: eveSandbox.id, resume: false });
await vercelSandbox.update({ ports: [port] });
const url = vercelSandbox.domain(port);
```

Only adapters that need SDK-only operations touch `@vercel/sandbox` directly:
`start_dev`, Preview control, interruptible Bash, and the read-only workspace channel.

## Traffic

- HTTP through the public URL works; a Vite dev server serves normally with
  `server: { host: true, allowedHosts: true, hmr: { protocol: "wss", clientPort: 443 } }`.
- **WebSocket upgrades work through the public URL.** Verified with a `ws` echo
  server on an exposed port answering a client over the public `wss://` address.
  This is the transport for both Vite HMR and the terminal.

## Stop / resume

- Stopping captures a snapshot; `Sandbox.get({ name, resume: true })` restores it.
- **The filesystem survives completely** — including `node_modules`.
- **Processes do not survive.** Anything spawned (dev server, helper servers) is
  gone after a resume.

The session header polls the sandbox status through the Eve service. Preview can stop
the VM, then resume it and restart the latest `start_dev` command. It does not supervise
or restore any other process.

## Snapshots and forks

Point-in-time filesystem branching exists; a live shared filesystem does not.

- `sandbox.stop()` (~5s) captures a snapshot automatically (`currentSnapshotId`).
  `sandbox.snapshot()` also exists but stops the sandbox to capture.
- `Sandbox.fork({ sourceSandbox: name })` creates a new sandbox from the source's
  **current snapshot**: ~1-2s to running, full filesystem inherited (node_modules,
  git history — 19 MB tree in the test, copy-on-write server-side).
- **Forks are only as fresh as the last stop.** Forking a running sandbox that was
  resumed and modified yields the pre-resume state; forking one that never stopped
  falls back to a fresh, empty sandbox.
- `Sandbox.create` also accepts `source: { type: "snapshot" | "git" | "tarball" }`.
- There are no shared volumes or cross-sandbox mounts. Continuous sync between
  sandboxes has to ride the network (see below).

## Git between sandboxes

Sandboxes reach each other through their public `vercel.run` URLs. Serving a
repo's `.git` directory read-only (git dumb protocol: a ~12-line static file
server plus `git update-server-info` after each commit) is enough for another
sandbox to `git fetch <url>/ main && git merge FETCH_HEAD` — measured at
**~270 ms** per round trip, warm or cold. Point-in-time state travels by fork;
ongoing deltas travel as commits.

## Observed defaults

2 vCPUs, 4 GB memory, region `iad1`, `node24`, Python 3, and git 2.49 in the image.
Creation from scratch takes under a second; resume ~0.3s. Sandboxes created without
a name get a random one; Eve always names them (see above).
