# 085 · Plugin-fragments: a fragment may be code, `from` takes it, and `law=` dissolves into it

**Date:** 2026-11-11 · **Status:** proposed. Two points are ruled: the owner on #691, 2026-11-11, "a plugin is a fragment: plugin-fragments (or fragment-plugins)" (§1), and "we dissolve law with an extended from" (§2). §3 to §6 are proposed. · Issues: #691

*Read with [065](065-fragments-take-arguments.md) (fragments take arguments: the `from` line, the signature), [054](054-instruments-and-use.md) (the host hands a resolver; the piece file's lockfile), [047](047-fragments-are-files.md) (fragments are files), [077](077-the-core-is-sound-up-to-an-interface.md) (cored up to a named interface) and Cell studio's [011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md) (show plugins: cells reads, the host runs). [086](086-the-view-lives-in-cell-studio.md) takes the show plugins out of cells.*

## Context

What a cell plays can be computed by code in two places today, and both are closed.

**`law=` has one value, wired by name.**
- `law=fiveto12` is checked as a string in `realize.ts` (its notes, from `fiveto12.notesBetween`, and its offset from the day's anchor) and in `duration.ts` twice (one day long; its twelve blocks as sections).
- It is also listed in `order.ts`, and it is a role in `compiler/roles.ts` and `limits.ts`. Cell studio's `pluginView.ts` checks it by name as well, to hand the sun `dayLaw()`.
- Its rate is written twice: `step=84bpm` on the cell, and `SECONDS_PER_STEP` in the law, which ignores the cell's.

**The generators are a closed table** (`parser/generators.ts`, `GENERATORS`). They run when the text is read and write an ordinary list braid, so everything after the parser sees only steps.

The wish (#691) is for code outside the language to compute part of what a piece plays. That covers a law beyond `fiveto12`, a generator beyond the table, and a braid written by an external program. And it has to happen without the text losing its place as the single source of truth.

The language already has a form for "this cell comes from elsewhere": a fragment, taken by a `from` line. It brings a signature, private inner names, a resolver the host hands, and a lockfile that pins it by hash.

## Decision

### 1. A plugin is a fragment whose body is code: a plugin-fragment

- **It is taken like any fragment:** `&x from id(named) main`. It has the same signature (065 §2), the same copy semantics (065 §3: its inner names are private), and the same rule that it reads only what it declares, plus sounds and taps.
- **It is a fragment file** (047). Its frontmatter is a fragment's (id, facet, association points), with `runtime: js` or `runtime: wasm` added. Its signature is a `from` line in a cells block, as any fragment's is. Its code implements the signature's head.
- **The code's form:** a code block (`js`) for JavaScript, or a file beside it, named by its hash, for WASM. Rung 5 of #691 settles this.
- **What it gains by being a fragment:** a plugin is one more thing the repository holds and queries (`styles`, `coverage`). The graph draws it as a cell, with edges, renames and edits. There is no second namespace beside the fragments.

### 2. `from` is extended: a head is a braid or a stream; `law=` retires

A plugin-fragment's head is one of two kinds:

| | **braid** | **stream** |
|---|---|---|
| What it is | steps, as any cell's braid | notes in time: what a law computed |
| Computed | once per call site, from its arguments | per window of steps, while it plays |
| Unbounded | no | yes: a day, or no end at all |
| The core (§4) | baked: `toCore` writes the braid it made | kept: the core keeps the `from` line |

- **A law becomes a `from` line.** `&cycle law=fiveto12 over=&day step=84bpm` is written `&cycle step=84bpm from fiveto12 &day`.
  - The day it reads is the main argument (065 §5: one bare reference is that cell).
  - `step=` is the head's attribute (065 §4), and it is **the** rate: the plugin works in steps, and the duplicated `SECONDS_PER_STEP` goes.
- **`law=` is the old way for a release.** It reads with a warning that names the `from` line, and Migrate writes the new spelling (049).
- **The `law` role goes.** `anchor=` stays on the clock it always belonged on (`roles.ts` already says so).
- **The bound:** `fiveto12` and `daytime`, rewritten, play the same events. Their event snapshots don't move.

### 3. The contract: data in, data out; cells types it, the host runs it

A plugin-fragment exports a manifest and one function for its kind.

- **The manifest:**
  - its kind, `braid` or `stream`;
  - for a stream, `span` (length and cycle in steps, or none) and `marks` (sections: a step and a label each), which are what `duration.ts` hard-codes for `fiveto12` today;
  - optionally `view`, the data a frontend's wheel may read, as the sun reads the day's blocks, modes and keys. The data only: drawing it is the frontend's (086).
- **A braid:** `braid(args) → steps`. The steps are values, lengths and rests: what a list braid holds.
- **A stream:** `between(from, to, args) → Float64Array`, with one row per note: `[step, dur, semitones, level, pan]`. A flat array crosses a worker boundary without copying, and a WASM export fills it in its own memory.
- **Arguments are values:**
  - a number or a word as written;
  - a cell argument as the plugin needs it: its steps for a braid, its offset for a clock (for `fiveto12`, where its day stands when play starts, against the law's own start).

  Exactly what a stream receives of a clock is rung 3's to settle.
- **Pure and deterministic:** the output is a function of the code, the arguments and the step. Run twice, it gives the same output. Cells ships a contract test that a host can run over any plugin.

### 4. The text and its lockfile are the truth

- **A plugin-fragment is pinned by its hash**, in the piece file's lockfile, like any fragment (054). The hash covers the code. A changed plugin is a different fragment.
- **A braid plugin is baked:** `toCore` writes the steps it made, so a piece's core plays without the code. The `from` line is the piece's spelling, and its core is plain cells.
- **A stream plugin is cored up to an interface** (077 §2): its head keeps its name, its `from` line and its hash. Identity, S1 and the snapshots hash the code beside the text.
- **A piece doesn't carry plugin code inline for its sound.** Cell studio's `=== plugin ===` block (011) is a drawing, and leaves cells (086). A piece that brings its own plugin brings it as a fragment file, by hash, the way it brings any fragment. If #672's document of fragments is accepted, that is the form a piece uses to carry one.

### 5. Runtime: workers, a minimal interface, JS or WASM; cells runs no foreign code

- **Cells stays pure.** It types the contract and never evaluates code: no `eval`, no `Function`, no `Worker` in `src/`.
- **A built-in plugin-fragment is a module of cells,** run in-process: `fiveto12` first. It is TypeScript like the rest of cells, so purity holds. It is a plugin only in shape: the same manifest and functions, so the frontends see one contract.
- **A foreign one runs where the host puts it:** a Worker, with the host's timeout. JS is an ES module that exports `manifest` and the function; TS is compiled by the host. A WASM module with **no imports** has no I/O at all: it is pure by construction.
- **Cells stays synchronous.** `parse`, `compile` and `realize` stay synchronous, and the host meets the worker halfway:
  - **braids** are resolved before compile, as uses are: the resolver hands the manifest, and the steps for each call site;
  - **streams** are read from a buffer the host fills ahead of play. A window not filled in time plays nothing and says so, as a diagnostic, never a hang. Rung 3 chooses and names the window and its deadline.

### 6. Trust is the host's

- **Built-ins** run without asking.
- **A foreign plugin-fragment** runs only if the host's rule says so. Proposed for Cell studio: WASM with no imports, in a worker with a timeout, runs unasked; JS asks, as show plugins do today.
- **Jambot rules its own case:** code in a shared piece runs on everyone's machine, so it needs a sandbox before it accepts foreign code (#691, rung 7).

## Why

- **One form for "comes from elsewhere".** A law, a generator and a fragment are all things a cell takes from outside its line. Folding them into `from` gives them the signature, the copy semantics, the resolver, the lockfile and the repository at once, and removes `law=`'s role and its five checks by name.
- **The text stays the truth.** A plugin is named by hash, and it is pure and deterministic. So a text plus its lockfile says exactly what plays, as it does for fragments today. Baking the braids keeps the core free of code wherever the output is finite.
- **Purity is untouched.** Cells types a contract and runs only its own TypeScript. Workers, WASM and trust are the host's, as running show plugins already is (011).

## Rejected

- **`law=` as an open registry of words:** a second namespace beside the fragments, with no signature, no hash and no lockfile.
- **Opening the generators table to code:** foreign code at parse time in every parser (node, the worker, the build, Jambot's server), not pinned by any hash.
- **Code carried inline in the text for sound,** as show plugins are: the piece is one file, but its identity would need a hash of a block, trusted text by text, with no repository to find it in. A fragment by hash does the same job with the machinery that exists.
- **An async `realize`:** every frontend's scheduler would change to admit a worker. A buffer filled ahead changes only the host that runs plugins.

## Consequences

- **#691's rungs:**
  - 1: `fiveto12` behind the contract, built in, `law=` still read, nothing played changes;
  - 3: the async resolution and its numbers;
  - 4: the worker runtime, in Cell studio, with `fiveto12` ported to WASM and measured against the TypeScript (the same S1 hash over a day, and the time per window);
  - 5: the file form and the `from` spelling, with Migrate;
  - 6: generator plugins;
  - 7: trust in Jambot.
- **A change a frontend notices:** `law=` warns once rung 5 lands, and Migrate rewrites it. The rewrite is a minor version, with its migration named in `changes/`.
- **Cell studio's `pluginView.ts`** reads a stream's `view` data, not `'fiveto12'` by name.
- **Not plugins:**
  - `scan`, `even`, `euclid`, `meter` and the waves are the foundation (072, 080).
  - `spell(…)` and `fifths()` are candidates for rung 6.
  - The default performer (`perform/`) has a stream's shape one level up (077's "for the band performers to fill in"). It is a later question, not this decision.
