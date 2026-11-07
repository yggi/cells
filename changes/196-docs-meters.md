### Repository

- **The docs' meters in the canonical spelling** (#196): `npm run normalise` takes `--blocks` (each cells block of a page normalised alone, as the docs' blocks are pieces of their own) and `--rules a,b` (only those rules' rewrites). Run with `--rules meter,tempo` over `docs/language/`, every `scan(1 1 1 1) step=…bpm` there is `meter("4/4") step=&tempo` with its `&tempo`, as the examples are since #343, and every bar's rate written as a value is a `&tempo` cell; each block sounds the same (S1).
