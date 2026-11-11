# 085 · Plugin-fragments: a fragment with holes its code fills with braid text; `law=` dissolves into `from`

**Date:** 2026-11-11 · **Status:** accepted, with two points left to see in rung 5 (§3, "to see"). The owner on #691, 2026-11-11, in order:

- "a plugin is a fragment: plugin-fragments (or fragment-plugins)";
- "we dissolve law with an extended from";
- on the questions: "1a; 2c combined with 3a, plugins weave into cells by filling the braid string; 4c; 5b; 6a; 7a; 8b";
- on the interface: "1) a [`pan=` moves], 2) keep for now [a hole's lap fixed], 3) clock as main argument slightly preferred, let's see, 4) yes, as suggested [sections from a hole], 6) yes".

· Issues: #691, #693

*Read with [065](065-fragments-take-arguments.md) (fragments take arguments: the `from` line, the signature), [054](054-instruments-and-use.md) (the host hands a resolver; the piece file's lockfile), [047](047-fragments-are-files.md) (fragments are files), [077](077-the-core-is-sound-up-to-an-interface.md) (cored up to a named interface), [070](070-s1-hears-as-a-listener.md) (S1 hears as a listener), [031](031-chance-keyed-on-time.md) (draws keyed on what plays, as amended by #481), and Cell studio's [011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md) (show plugins: cells reads, the host runs). [086](086-the-view-lives-in-cell-studio.md) takes the show plugins out of cells.*

## Context

What a cell plays can be computed by code in two places today, and both are closed.

**`law=` has one value, wired by name.**
- `law=fiveto12` is checked as a string in `realize.ts` (its notes, as semitones, from `fiveto12.notesBetween`, and its offset from the day's anchor) and in `duration.ts` twice (one day long; its twelve blocks as sections).
- It is also listed in `order.ts`, and it is a role in `compiler/roles.ts` and `limits.ts`. Cell studio's `pluginView.ts` checks it by name as well.
- Its rate is written twice: `step=84bpm` on the cell, and `SECONDS_PER_STEP` in the law, which ignores the cell's.
- And the law computes its modes, keys and chords itself, so none of the language's tables, picks or degrees reach its notes.

**The generators are a closed table** (`parser/generators.ts`, `GENERATORS`). They run when the text is read and write an ordinary list braid.

The wish (#691) is for code outside the language to compute part of what a piece plays, without the text losing its place as the single source of truth. The language already has a form for "this cell comes from elsewhere": a fragment, taken by a `from` line, with a signature, private inner names, a resolver and a lockfile.

## Decision

### 1. A plugin-fragment is a fragment with holes; its code fills them with braid text

**A plugin-fragment is a fragment file (047)** whose cells block is ordinary cells, except that some cells' braids are **holes**, written `fill()`. Its code fills each hole with braid text, the language's own notation. Everything around the holes (tables, attributes, levels, mixes) is plain cells, and the text the code returns is read as any braid is. So **plugins weave into cells:** the code writes notes and the language does the rest.

````markdown
---
id: fiveto12
runtime: wasm
code: fiveto12.wasm # beside it, with its source (fiveto12.ts, AssemblyScript)
hash: e1:… # of the .wasm; the lockfile pins this
holes:
  mode: { lap: 840 } # a stream: a fill per key (840 steps)
  tonic: { lap: 840 }
  notes: { lap: 12 } # a fill per 12/8 bar
  level: { lap: 12 }
  space: { lap: 12 }
  block: { lap: 10080, mark: true } # a section per block of two hours, its text the label
origin: 11.55 # where lap 0 sits on the day it reads
---

```cells
&cycle from &day
&cycle [&notes * &level]
&notes over=&key pan=&space fill()
&level map=amp fill()
&space map=lin fill()
&key scale(&mode, &tonic)
&mode fill()
&tonic fill()
&block fill()
```
````

- **The signature, the call site, the copy semantics, the resolver and the lockfile are a fragment's** (065, 054): its inner names are private, and it reads only what it declares, plus sounds and taps.
- **A hole's kind is its frontmatter entry:**
  - **no `lap:`, a braid:** filled once per call site from its arguments, and baked by `toCore` (§4);
  - **a `lap:`, a stream:** filled once per lap, lap after lap, without end or until `laps:`. A stream is `<…>` whose list the code writes as it is reached.
- **A hole's lap length is fixed** (the owner: "keep for now"). Lap *n* starts at *n* × its length, so any moment can be found directly, as a law's day can today. A varying length waits for a need.
- **Sections are a hole** marked `mark: true`: each lap is a section, its text the label. `duration.ts` keeps no special case.

### 2. `from` takes it; `law=` retires

```cells
&day scan(1!24) loop=1d anchor=11.55 show=sun
&cycle from fiveto12 &day
&present [&cycle * &glass * .3]
```

- `&cycle law=fiveto12 over=&day step=84bpm` becomes `&cycle from fiveto12 &day`.
- **`law=` is the old way for a release,** with a warning that names the `from` line. Migrate writes the new spelling (049). The `law` role goes; `anchor=` stays on the clock.
- **The law is now read by the language.** It writes degrees over `&key`, chords as stacks (`[1, 3, 5]`), lengths as `@n`, levels as a `map=amp` cell and places as a `map=lin` one. Its mode and tonic are cells, so a pick, a `^n` or a turn of the key reaches its notes, and the graph shows its cells.
- **The bound:** `fiveto12` and `daytime`, rewritten, sound the same. Their event snapshots may move only in how a note's place is carried (§5).

### 3. The interface: text in, text out

```ts
// cells types this; the host runs it, answering synchronously (§6)
interface Holes {
  fill(hole: string, lap: number, args: Readonly<Record<string, string>>): string;
}
```

- **The arguments are text:** each argument cell's braid as written (`{ k: "7", n: "12" }`). Text in and text out, so no plugin depends on cells' AST, which stays free to change.
- **The answer is a braid**, parsed as any braid is. An error in it points at the fragment and the lap.
- **The plugin never sees time.** Cells computes the lap from the clock, the clock's `anchor=` and the fragment's `origin` (the owner's 1a).
- **Two things to see in rung 5:**
  - **The clock is the main argument** (the owner: "slightly preferred, let's see"). The holes are timed through it inside the fragment (`&notes step=&day/120960 …`: a step of fiveto12 is a 120,960th of the day), so the piece writes no rate at all. The other way: the head's `step=` sets the rate, and the main argument only anchors.
  - **The cost:** a bar of `fiveto12` is about 100 characters, at 7 bars a minute. Rung 3 measures parsing it against the TypeScript law it replaces.

**Real answers.** `fiveto12` today, Ionian, bars 0 and 1, as the text it would return:

```text
fill("notes", 0) → "[1, 3]@2 [5, 7, 9, 11, 13, 15]@2 [2, 4, 6] [6, 8, 10, 12, 14, 16, 18]@2 [3, 5, 7, 9]@2 0@2 [4, 6, 8, 10, 12]"
fill("level", 0) → ".40@2 .84@2 .51 .18@2 .62@2 .29@2 .73"
fill("notes", 1) → "[6, 8, 10, 12, 14, 16]@2 [3, 5, 7]@2 [0, 2, 4, 6, 8, 10, 12] [4, 6, 8, 10]@2 1@2 [5, 7, 9, 11, 13]@2 [2, 4]"
```

**A braid hole, baked.** `necklace`, whose hole has no lap:

```text
the fragment: &hits from (&n, &phase) &k · &n 12 · &phase 0 · &hits fill()
the piece:    &bell step=8n from necklace(n=12, phase=5) 7
cells asks:   fill("hits", 0, { k: "7", n: "12", phase: "5" }) → "x ~ x ~ x x ~ x ~ x ~ x"
toCore:       &bell step=8n x ~ x ~ x x ~ x ~ x ~ x
```

### 4. The text and its lockfile are the truth

- **The code is a fragment's, by hash, always** (the owner's 4c). It lives in a fragment file, pinned in the piece file's lockfile (054). A piece that travels as one file carries its fragments through #672's document of fragments, once that is accepted. No inline `=== plugin ===` block for sound.
- **A braid hole is baked:** `toCore` writes the text it was filled with, so a piece's core plays without the code.
- **A stream hole is cored up to an interface** (077 §2): its head keeps its name, its `from` line and its hash.
- **Identity is what plays** (the owner's 5b). The lockfile pins the code exactly. Identity, sameness and S1 compare the events, as for every piece (070, 031), so a plugin refactored without changing its output is the same piece.

### 5. `pan=` moves

A melody's step has no gain or pan of its own, and `pan=` is not among the parameters a cell moves. So a law's fifth dimension, space, had no spelling. **`pan=` moves, like `lpf=`:** it takes a number, a `free()`, a cell, or a range times cells (078, 079). So `&notes pan=&space` places each note as `&space` stands when it sounds.

This is general, not the law's: any line can pan as it plays. Its own issue makes it, before rung 5. The `fiveto12` event snapshot then carries a note's place as its `pan` parameter, where the law today folds it into the gains. It sounds the same, and the snapshot moves in representation only.

### 6. Runtime: WASM in workers; cells runs no foreign code and stays synchronous

- **Cells stays pure.** It types the interface and never evaluates code: no `eval`, no `Function`, no `Worker` in `src/`.
- **A built-in plugin-fragment is a module of cells,** run in-process: `fiveto12` first, answering `fill()` in TypeScript. It is a plugin only in shape, the same interface the frontends see.
- **A foreign one is WASM** (the owner's 7a): written in AssemblyScript (TypeScript-like), Rust, C or Zig, with **no imports**. Its boundary:

  ```text
  exports: memory
           alloc(len: i32) → i32                                     the host writes the arguments (UTF-8 JSON) here
           fill(hole: i32, lap: f64, args: i32, argsLen: i32) → i64   a pointer and a length to UTF-8 text, packed
  imports: none
  ```

  The holes are numbered in the frontmatter's order. WASM's arithmetic is exact across machines (NaN payloads aside), which JavaScript's `Math` is not: Jambot's players must hear the same notes. JavaScript waits for a need, as a frontend's trusted local development.
- **Cells calls `fill` synchronously** (the owner's 6a), and the host decides how to answer. In Cell studio, it reads a buffer a worker fills ahead of play. In Node and the tools, it calls the module in-process. A lap not filled in time plays nothing and says so: a diagnostic, never a hang.
- **The output is a pure function of (hash, hole, lap, arguments),** so the host caches on that key. The buffer is laps filled ahead. Rung 3 names the window and the deadline; proposed: at least 4 s ahead, in chunks of 8 s, 250 ms before a worker counts as hung.

### 7. Trust

- A **WASM module with no imports** runs without asking (the owner's 8b), in a worker with a timeout, at most 16 MB of memory, and cells' notes-per-second limit on what its text plays. This is the same rule in Cell studio and Jambot.
- A module that wants imports (time, randomness, the network) is **refused, not asked about**. Randomness comes from cells' seed (031) as an argument, so chance stays reproducible.
- Built-ins run in-process.

## Why

- **One form for "comes from elsewhere".** A law, a generator and a fragment are all things a cell takes from outside its line. Folding them into `from` gives them the signature, the copy semantics, the resolver, the lockfile and the repository at once, and removes `law=`'s role and its five checks by name.
- **Text, not data.** A plugin that writes braid text is read by the language, not beside it: the law's notes go through `&key`, the picks, the degrees, the graph. The AST stays private, and the parser checks every answer. A braid baked is the text it was filled with.
- **The text stays the truth.** A plugin is named by hash and is pure. A text plus its lockfile says exactly what plays, as it does for fragments today, and the core of a finite braid is free of code.
- **Purity is untouched.** Cells types an interface and runs only its own TypeScript. Workers, WASM and the caps are the host's.

## Rejected

- **Data out** (rows of `[step, dur, semitones, level, pan]`): the notes bypass the language, the law stays a black box, and cells would need a second path through realize beside the braid's.
- **`law=` as an open registry of words:** a second namespace beside the fragments, with no signature, no hash and no lockfile.
- **Opening the generators table to code:** foreign code at parse time in every parser, not pinned by any hash.
- **Code carried inline in the text for sound:** a fragment by hash does the same job with the machinery that exists.
- **An async `realize`:** every frontend's scheduler would change. A buffer filled ahead changes only the host that runs plugins.
- **JavaScript for foreign code:** I/O to forbid rather than absent, and `Math` that differs between engines.
- **Lengths that vary from lap to lap:** a lap could no longer be found directly. Kept out until there is a need.

## Consequences

- **#691's rungs:**
  - 1 (#693): `fiveto12` answers `fill()` as text, built in, and realize plays its holes; `law=` is still read;
  - an issue of its own: `pan=` moves (§5);
  - 3: the buffer and its numbers;
  - 4: the WASM runtime in Cell studio, with `fiveto12` ported to AssemblyScript and the same S1 hash over a day;
  - 5: the file form, `from` with holes, the clock as the main argument, Migrate;
  - 6: braid holes (`necklace`, `spell(…)` as candidates);
  - 7: foreign plugin-fragments in both frontends.
- **A change a frontend notices:** `law=` warns once rung 5 lands, and Migrate rewrites it, as a minor version with the migration in `changes/`. `pan=` moving is an addition. Cell studio's `pluginView.ts` reads the law's cells (`&mode`, `&tonic`, the sections), not `'fiveto12'` by name.
- **Not plugins:**
  - `scan`, `even`, `euclid`, `meter` and the waves are the foundation (072, 080).
  - The default performer (`perform/`) has a stream's shape one level up (077). It is a later question.
