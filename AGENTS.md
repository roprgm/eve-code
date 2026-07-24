# Development guidelines

eve-code is a real coding agent built with as little code as possible. The repository
should make the implementation feel obvious. Minimalism, clarity, and speed are part
of the product.

## Architecture

- Read `ARCHITECTURE.md` before changing data flow, state ownership, persistence,
  external boundaries, runtime dependencies, or code across layers. Follow its
  ownership and dependency map, and update it when the architecture changes.
- Before changing Eve agents, tools, hooks, channels, sandboxes, sessions, or
  streaming, read the relevant guide in `node_modules/eve/docs/`; it matches the
  installed version. Use https://eve.dev/docs only when package docs are unavailable.

## Code

- Build the smallest correct solution. Every abstraction, state value, effect,
  component, file, and dependency must earn its place. No clever code.
- Ask before adding runtime compatibility for legacy stored data; prefer one-time
  cleanup.
- Keep functions and components small, linear, and responsible for one thing. If a
  unit must understand unrelated or partially defined data, fix the boundary or data
  model.
- Compose sibling capabilities in their nearest common parent. A component owns only
  the behavior implied by its name; do not move unrelated actions into it to hide
  coordination. An optional feature must be removable by deleting its import and
  composition node without breaking sibling capabilities.
- Mutable JSX variables are an antipattern. Compose focused components with early
  returns instead of assigning JSX to `let` variables.
- Keep one source of truth and derive the rest. Model state with one explicit status,
  not overlapping booleans or synchronization effects.
- Keep logic above JSX. Avoid ternaries and boolean chains in markup. Use
  `useEffect` only for external boundaries, not to synchronize React state.
- Prefer platform and framework primitives. Add a helper, wrapper, or dependency only
  when it makes the whole system simpler.
- Write self-explanatory code with almost no comments. Order files simple-to-complex:
  helpers and small components first, main export last.
- Use intent-revealing names: verbs for functions, `onX` for event handlers, nouns
  for values, camelCase identifiers, and kebab-case files. Use snake_case only for
  external contracts such as Eve tool slugs.
- Write all code, comments, documentation, and commits in English.

## Product

- Render cached data, navigate without waiting for the network, and lazy-load heavy
  UI. Do not replace available cached content with a spinner.
- Reuse the existing design tokens. New surfaces or visual deviations require owner
  approval. The app is dark mode only.

## Verification

- Run `bun run check` and the relevant tests before declaring work complete.
