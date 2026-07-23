# Possible Eve improvements

Observations from building Eve Code with Eve 0.24.6. These are possible framework
directions, not requirements; the project keeps its local responses narrow.

## Interrupt running sandbox commands

Cancellation reaches sandbox command creation, but the multiplexed command adapter
waits for logs and process completion without the turn's abort signal. Propagating
that signal through the wait and optionally killing the process would let built-in
Bash settle promptly after Stop.

Eve Code currently overrides Bash to bind cancellation and kill the active command.

## Preserve useful context from interrupted turns

An interrupted turn can resume from its pre-turn session state while partial events
remain visible in the stream. Preserving completed parts of the turn and adding an
interruption marker would keep the model's context aligned with what the user sees.

## Bound long-running shell commands

An optional default timeout for built-in Bash could turn an accidental server, REPL,
or blocked command into recoverable tool feedback. Eve Code instead instructs the
agent to use `start_dev` for long-lived processes.

## Expose sandbox operations

The sandbox handle does not expose ports, public URLs, status, stop, or resume.
Optional portable capabilities for those operations could remove direct provider SDK
lookups. Eve Code keeps those lookups inside `start_dev` and narrow channels.

## Restore declared services

Sandbox files survive idle resume, but processes do not. An opt-in declaration for
restorable services could cover this lifecycle. Eve Code currently replays the latest
`start_dev` command when Preview resumes.
