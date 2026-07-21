# Development guidelines

This project is a statement: a real coding agent built with as little code as possible.
Whoever reads it should think "look how little it takes". Minimalism is the number-one
priority, and clarity is part of the product.

- Build the smallest correct solution, in the fewest lines that stay obvious. Every line,
  abstraction, state value, effect, component, file, and dependency must earn its place.
- Ask before adding runtime compatibility for legacy stored data; prefer one-time cleanup.
- Keep components and functions small, with one clear responsibility, small explicit
  inputs, and linear flow. If something needs to understand nested or partially defined
  data outside its concern, fix the boundary or the data model instead.
- No clever code. No ternaries or boolean chains inside JSX — extract an early return,
  a variable, or a small component. If a reader pauses, rewrite it.
- Almost no comments. Code this small and well named explains itself; a comment that
  restates the code is noise. Where one is truly needed — a constraint the code
  cannot express — keep it to one short line.
- Keep logic out of markup. Compute above, render below: JSX should read as plain
  structure, not as a program.
- Reach for `useEffect` last. Prefer derived values, event handlers, and the reactive
  primitives the stack already provides (Convex queries, router loaders). An effect is
  a boundary to something external, not a synchronization tool.
- Prefer one source of truth and derive everything else. If the UI needs
  synchronization, repeated guards, or defensive branches, simplify the architecture
  first.
- Model state explicitly. One status value (`"idle" | "running" | "error"`) beats a
  pile of booleans; a condition combining several flags with `&&`/`||` gets a named
  variable, or better, disappears into the state model. If code must ask three
  questions to know what is going on, the state is modeled wrong.
- Prefer native platform and framework primitives. Add helpers, wrappers, or
  dependencies only when they make the whole system simpler.
- Respect the layer map in ARCHITECTURE.md ("Structure and layers"). Dependencies
  point downward only; if code seems to need an import from a higher layer, the code
  is in the wrong place — move it, never bend the rule.
- Order files simple-to-complex: helpers and small components first, the main
  export last. By the time a reader reaches the big component, every piece it uses
  is already understood.
- Names state intent. Functions and methods start with a verb that says what they
  do — `get` retrieves, `compute` derives, `set` writes, `is`/`has` answer —
  event handlers are `onX`, and values are nouns. A bare one-word function that
  hides whether it fetches, computes, or mutates does not pass review.
- Identifiers are camelCase; snake_case only where an external contract requires it
  (Eve tool slugs like `edit_file`). Files are kebab-case.
- Formatting and lint are Biome's job (`bun run check`). Style debates end where
  Biome begins.
- Fast is part of quality. Render from the local cache, navigate without waiting for
  the network, and lazy-load anything heavy. A spinner where cached data could have
  been shown is a bug.
- Design is owner-approved. Reuse the existing tokens for color, contrast,
  spacing, and type. Never invent new visual design — any new surface, token, or
  deviation ships only after the owner has seen it and approved it.
- Everything in this repository is written in English: code, comments, docs, commits.
