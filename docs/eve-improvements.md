# Potential Eve improvements

Framework limitations observed while building this project.

## Recover orphaned sandbox template locks

If `eve dev` exits before releasing a sandbox template lock, the next process waits on the dead owner's lock and eventually times out. After confirming Eve is stopped, remove the orphaned lock under `.eve/sandbox-cache/template-locks`.

Eve records the owner's PID and could remove the lock when that process no longer exists.

## Expose sandbox ports

`ctx.getSandbox()` can spawn a server but cannot expose its port or return its public URL. `start_dev` must look up the same sandbox through `@vercel/sandbox`; Eve could expose these operations on its sandbox handle.

## Restore sandbox processes

Eve restores the filesystem after idle, but not spawned processes. This demo calls `start_dev` again on each web turn; Eve could support declared long-running services.
