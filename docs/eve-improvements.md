# Potential Eve improvements

Framework limitations observed while building this project.

## Honor the abort signal while a command runs

**Impact.** Stopping a turn cannot interrupt a running `bash` command. With a command that never exits, the turn can never settle: `turn.cancelled` and `session.waiting` are never emitted, hooks never observe the turn ending, and any persistence built on those events records the session as running forever — the conversation is permanently stuck.

**Root cause (0.24.6, still present in 0.27.0).** Cancelling a turn aborts the in-step signal, and `bindSandboxAbortSignal` composes that signal into every sandbox operation's options — so far so good. But the command adapter (`execution/sandbox/multiplexed-command.js`, `adaptMultiplexedCommandToSandboxProcess`) calls `command.wait()` and `command.logs()` without a signal, so the abort only covers starting the command, never waiting for it. The `bash` tool call stays pending until the process exits on its own.

**Reproduce** (built-in `bash`, Vercel backend):

1. Ask the agent to run a command that never exits, e.g. `python3 -m http.server`.
2. While it runs, cancel the turn.
3. The abort signal fires, but the `bash` tool call never resolves; no boundary event is emitted; a hook subscribed to `session.waiting` never fires.

**Expected.** Cancelling rejects the in-flight wait — pass the bound signal to `command.wait()`/`command.logs()` — and ideally kills the process. This project works around it with a `bash` override that spawns the command and kills it when the tool's abort signal fires.

## Preserve interrupted turns in session context

**Impact.** After a user interrupts a turn, the model has no memory that the turn ever happened — not even the user's message that started it. The event stream still shows the partial turn, so any UI built on it renders work the model then denies having done. Interrupting an agent should behave like interrupting a chat: it stops, remembers where it was, and the conversation continues.

**Root cause (0.24.6, still present in 0.27.0).** A whole turn runs as one durable workflow step (`execution/workflow-steps.js`, `turnStep`). Its cancellation catch returns the step's input verbatim — `{action: "cancelled", sessionState: o.sessionState}` — which is the session as it was before the turn, discarding the user's message, assistant text, and completed tool calls. `settleCancelledTurnStep` then emits `turn.cancelled` + `session.waiting` whose continuation token points at that pre-turn state, so the next turn continues from a history in which the interrupted turn never existed.

**Reproduce:**

1. Start a fresh session and send "run the command sleep 30".
2. The model replies and calls `bash`; cancel the turn a few seconds in.
3. Send "what did you just do?".
4. Observed: "I haven't done anything yet — this is the start of our conversation." Expected: the model remembers the interrupted request and whatever completed before the abort, ideally with an interruption marker appended before settling.

## Bound built-in bash commands

The built-in `bash` tool runs commands with no timeout, so one blocking command — a dev server, a REPL — hangs the turn until the sandbox dies. A configurable default timeout would turn that model mistake into tool feedback it can correct.

## Recover orphaned sandbox template locks

If `eve dev` exits before releasing a sandbox template lock, the next process waits on the dead owner's lock and eventually times out. After confirming Eve is stopped, remove the orphaned lock under `.eve/sandbox-cache/template-locks`.

Eve records the owner's PID and could remove the lock when that process no longer exists.

## Expose sandbox ports

`ctx.getSandbox()` can spawn a server but cannot expose its port or return its public URL. `start_dev` must look up the same sandbox through `@vercel/sandbox`; Eve could expose these operations on its sandbox handle.

## Restore sandbox processes

Eve restores the filesystem after idle, but not spawned processes. This demo calls `start_dev` again on each web turn; Eve could support declared long-running services.
