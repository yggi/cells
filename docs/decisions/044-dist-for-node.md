# 044 · dist/ for Node

Date: 2026-10-17 · Status: accepted · Issue: [#11](https://github.com/yggi/cells/issues/11)

## Context

The package ships TypeScript. A bundler (Vite, Vitest) reads it; Node doesn't: it refuses to strip types in a dependency (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), the source's relative imports have no extensions, and its parameter properties need a transform. Jambot's lobby and both frontends' tools run on Node.

## Decision

`dist/` is the source as JavaScript, committed like `types/` (a git dependency has no build step on install), written by `npm run dist` (`tools/dist.ts`) and checked for staleness by `tools/dist.test.ts`.

- **Emitter:** TypeScript's `transpileModule` per file (types and parameter properties removed, comments dropped) with a transformer that spells each relative import with the file it names (`./compile` → `./compile.js`, a folder → `./folder/index.js`). No bundler: the module graph, and so `@yggi/cells/engine/*`, stays as it is.
- **Condition:** `exports` gets `module` (the source) before `default` (dist/). Vite and Vitest resolve with `module` and keep the `.ts` source; Node knows no `module` condition and takes `default`. Not `node`: Vitest resolves with it too and would have moved to dist/.

## Consequences

- The installed package grows by 0.8 MB unpacked (2.8 → 3.6 MB; the bound was 1.2 MB), 0.22 MB packed.
- A change to `src/` needs `npm run dist` (a test says so), as it needs `npm run types`.
- Nothing about the language changes.
