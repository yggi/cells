# 085 · Plugin-fragments: a fragment whose fills its code writes as braid text; `law=` dissolves into `from`

**Date:** 2026-11-11 · **Status:** accepted, with two points left to see in rung 5 (§3, "to see"). The owner on #691, 2026-11-11, in order:

- "a plugin is a fragment: plugin-fragments (or fragment-plugins)";
- "we dissolve law with an extended from";
- on the questions: "1a; 2c combined with 3a, plugins weave into cells by filling the braid string; 4c; 5b; 6a; 7a; 8b";
- on the interface: "1) a [`pan=` moves], 2) keep for now [a fill's lap fixed], 3) clock as main argument slightly preferred, let's see, 4) yes, as suggested [sections from a fill], 6) yes";
- on places, 2026-11-12: "yes, pan on a line like legato" (§5);
- on a solver's needs (#747, #748, #749, found by yggi/countercell), 2026-11-13: "recommendations accepted", with the amendments proposed alongside them (§8).

· Issues: #691, #693, #696, #727, #739, #747, #748, #749

*Read with [065](065-fragments-take-arguments.md) (fragments take arguments: the `from` line, the signature), [054](054-instruments-and-use.md) (the host hands a resolver; the piece file's lockfile), [047](047-fragments-are-files.md) (fragments are files), [077](077-the-core-is-sound-up-to-an-interface.md) (cored up to a named interface), [070](070-s1-hears-as-a-listener.md) (S1 hears as a listener), [031](031-chance-keyed-on-time.md) (draws keyed on what plays, as amended by #481), and Cell studio's [011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md) (show plugins: cells reads, the host runs). 086 (the view lives in Cell studio, proposed in its own pull request) takes the show plugins out of cells.*

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

### 1. A plugin-fragment is a fragment with fills; its code writes them as braid text

**A plugin-fragment is a fragment file (047)** whose cells block is ordinary cells, except that some cells' braids are **fills**, written `fill()`. Its code writes each fill as braid text, the language's own notation.

*A fill, not a hole* (#727): decision 047's holes are what a fragment uses and doesn't define (`repository/holes.ts`, `holesOf`). An earlier draft of this record, and rung 1's first code, called a fill a hole; the code says `engine/fills.ts`, `Fill`, `fills:`. Everything around the fills (tables, attributes, levels, mixes) is plain cells, and the text the code returns is read as any braid is. So **plugins weave into cells:** the code writes notes and the language does the rest.

````markdown
---
id: fiveto12
runtime: wasm
code: fiveto12.wasm # beside it, with its source (fiveto12.ts, AssemblyScript)
hash: e1:… # of the .wasm; the lockfile pins this
fills:
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
&notes over=&key fill()
&level map=amp fill()
&space map=lin fill()
&key scale(&mode, &tonic)
&mode fill()
&tonic fill()
&block fill()
```
````

- **The signature, the call site, the copy semantics, the resolver and the lockfile are a fragment's** (065, 054): its inner names are private, and it reads only what it declares, plus sounds and taps.
- **A fill's kind is its frontmatter entry:**
  - **no `lap:`, a braid:** filled once per call site from its arguments, and baked by `toCore` (§4);
  - **a `lap:`, a stream:** filled once per lap, lap after lap, without end or until `laps:`. A stream is `<…>` whose list the code writes as it is reached.
- **A fill's lap length is fixed** (the owner: "keep for now"). Lap *n* starts at *n* × its length, so any moment can be found directly, as a law's day can today. A varying length waits for a need.
- **Sections are a fill** marked `mark: true`: each lap is a section, its text the label. `duration.ts` keeps no special case.

### 2. `from` takes it; `law=` retires

```cells
&day scan(1!24) loop=1d anchor=11.55 show=sun
&cycle from five_to_twelve &day
&present [&cycle * &glass * .3]
```

- `&cycle law=fiveto12 over=&day step=84bpm` becomes `&cycle from five_to_twelve &day`. (The fragment's id is `five_to_twelve`: the example *5 to 12* is `fiveto12`, and pieces and fragments share one namespace; the law's word stays `fiveto12`. Rung 5, #772.)
- **`law=` is the old way for a release,** with a warning that names the `from` line. Migrate writes the new spelling (049). The `law` role goes; `anchor=` stays on the clock.
- **The law is now read by the language.** It writes degrees over `&key`, chords as stacks (`[1, 3, 5]`), lengths as `@n`, levels as a `map=amp` cell and places as a `map=lin` one. Its mode and tonic are cells, so a pick, a `^n` or a turn of the key reaches its notes, and the graph shows its cells.
- **The bound:** `fiveto12` and `daytime`, rewritten, sound the same. Their event snapshots may move only in how a note's place is carried (§5).

### 3. The interface: text in, text out

```ts
// cells types this; the host runs it, answering synchronously (§6)
interface Fills {
  fill(name: string, lap: number, args: Readonly<Record<string, string>>): string;
}
```

- **The arguments are text:** each argument in its core (§8.3), in a versioned grammar (`wire: 1`); for `necklace`'s numbers that is what's written (`{ k: "7", n: "12" }`). Text in and text out, so no plugin depends on cells' AST, which stays free to change.
- **The answer is a braid**, parsed as any braid is. An error in it points at the fragment and the lap. **Or a refusal** (§8.1): no text, and the reason why.
- **The plugin never sees time.** Cells computes the lap from the clock, the clock's `anchor=` and the fragment's `origin` (the owner's 1a).
- **Two things to see in rung 5:**
  - **The clock is the main argument** (the owner: "slightly preferred, let's see"). The fills are timed through it inside the fragment (`&notes step=&day/120960 …`: a step of fiveto12 is a 120,960th of the day), so the piece writes no rate at all. The other way: the head's `step=` sets the rate, and the main argument only anchors.
  - **The cost:** a bar of `fiveto12` is about 100 characters, at 7 bars a minute. Rung 3 measures parsing it against the TypeScript law it replaces.

**Real answers.** `fiveto12` today, Ionian, bars 0 and 1, as the text it would return:

```text
fill("notes", 0) → "[1, 3]@2 [5, 7, 9, 11, 13, 15]@2 [2, 4, 6] [6, 8, 10, 12, 14, 16, 18]@2 [3, 5, 7, 9]@2 0@2 [4, 6, 8, 10, 12]"
fill("level", 0) → ".40@2 .84@2 .51 .18@2 .62@2 .29@2 .73"
fill("notes", 1) → "[6, 8, 10, 12, 14, 16]@2 [3, 5, 7]@2 [0, 2, 4, 6, 8, 10, 12] [4, 6, 8, 10]@2 1@2 [5, 7, 9, 11, 13]@2 [2, 4]"
```

**A braid fill, baked.** `necklace`, whose fill has no lap:

```text
the fragment: &hits from (&n, &phase) &k · &n 12 · &phase 0 · &hits fill()
the piece:    &bell step=8n from necklace(n=12, phase=5) 7
cells asks:   fill("hits", 0, { k: "7", n: "12", phase: "5" }) → "x ~ x ~ x x ~ x ~ x ~ x"
toCore:       &bell step=8n x ~ x ~ x x ~ x ~ x ~ x
```

### 4. The text and its lockfile are the truth

- **The code is a fragment's, by hash, always** (the owner's 4c). It lives in a fragment file, pinned in the piece file's lockfile (054). A piece that travels as one file carries its fragments through #672's document of fragments, once that is accepted. No inline `=== plugin ===` block for sound.
- **A braid fill is baked:** `toCore` writes the text it was filled with, so a piece's core plays without the code. **Its answer is also recorded in the lockfile** (§8.2), keyed by its arguments' core, so a piece opens playing it.
- **A stream fill is cored up to an interface** (077 §2): its head keeps its name, its `from` line and its hash.
- **Identity is what plays** (the owner's 5b). The lockfile pins the code exactly. Identity, sameness and S1 compare the events, as for every piece (070, 031), so a plugin refactored without changing its output is the same piece.

### 5. `pan=` moves

A melody's step has no gain or pan of its own, and `pan=` was not among the parameters a cell moves. So a law's fifth dimension, space, had no spelling. **`pan=` moves, like `lpf=`** (#696, landed): it takes a number, a `free()`, a cell, or a range times cells (078, 079), read at each note's start into its channel gains, as a fixed one is.

**But `pan=` is a voice's attribute, not a line's** (found in #727). `&notes pan=&space` does nothing ("pan= acts on a voice"), so a fragment's places reach its notes only through the voice they play on: `fiveto12`'s laps play on a voice of realize's own, which reads `pan=&space` (`PluginFragment.voice`). Its event snapshot doesn't move. A stream played on a *piece's* voice (rung 5) needs its places spelled another way: **`pan=` on a line, as `legato=` is** (the owner, 2026-11-12; #739): the place of the notes the line plays, a balance after the voice's own. `pan=` alone makes no cell a voice (`VOICE_MAKERS`). Then `fiveto12` writes `&notes over=&key pan=&space fill()`, and `PluginFragment.voice` goes.

### 6. Runtime: WASM in workers; cells runs no foreign code and stays synchronous

- **Cells stays pure.** It types the interface and never evaluates code: no `eval`, no `Function`, no `Worker` in `src/`.
- **A built-in plugin-fragment is a module of cells,** run in-process: `fiveto12` first, answering `fill()` in TypeScript. It is a plugin only in shape, the same interface the frontends see.
- **A foreign one is WASM** (the owner's 7a): written in AssemblyScript (TypeScript-like), Rust, C or Zig, with **no imports**. Its boundary:

  ```text
  exports: memory
           alloc(len: i32) → i32                                     the host writes the arguments (UTF-8 JSON) here
           fill(index: i32, lap: f64, args: i32, argsLen: i32) → i64   a pointer and a length to UTF-8 text, packed
  imports: none
  ```

  The fills are numbered in the frontmatter's order. WASM's arithmetic is exact across machines (NaN payloads aside), which JavaScript's `Math` is not: Jambot's players must hear the same notes. JavaScript waits for a need, as a frontend's trusted local development.
- **Cells calls `fill` synchronously** (the owner's 6a), and the host decides how to answer. In Cell studio, it reads a buffer a worker fills ahead of play. In Node and the tools, it calls the module in-process. A lap not filled in time plays nothing and says so: a diagnostic, never a hang.
- **The output is a pure function of (hash, fill, lap, arguments),** so the host caches on that key. The buffer is laps filled ahead. Rung 3 names the window and the deadline; proposed: at least 4 s ahead, in chunks of 8 s, 250 ms before a worker counts as hung.
- **A braid fill has a budget of its own** (§8.2): fuel, a count the module keeps, and a 10 s deadline that refuses.

### 7. Trust

- A **WASM module with no imports** runs without asking (the owner's 8b), in a worker with a timeout, at most 16 MB of memory, and cells' notes-per-second limit on what its text plays. This is the same rule in Cell studio and Jambot.
- A module that wants imports (time, randomness, the network) is **refused, not asked about**. Randomness comes from cells' seed (031) as an argument, so chance stays reproducible.
- Built-ins run in-process.

### 8. Under a solver: several fills, a refusal, a budget, arguments in their core

A solver as a plugin-fragment (yggi/countercell: counterpoint added to a subject, a Viterbi search in Rust, WASM with no imports) needs what `fiveto12` never did. Ruled 2026-11-13, on #747, #748 and #749.

**1. Several fills, and a refusal** (#747).
- **One computation, several fills:** the module may memoise on its arguments, and the host calls a call site's fills one after another in the frontmatter's order. Cells documents that it may.
- **The count is the file's:** one fragment per count (`countercell2`, `countercell3`). 065's signature already takes several heads by their names: `&upper, &lower from countercell3 &subject`.
- **A refusal:** at the WASM boundary a negative length, with the reason (UTF-8) at the pointer; a built-in answers `{ refused: string }`. Cells says it as a **warning** on the `from` line ("countercell3 refused: …"), and the fill plays nothing, as a lap not filled in time does. A warning, not an error: an error leaves the whole piece unplayed. A thrown error stays a bug in the module.

**2. A braid fill's budget** (#748).
- **Fuel:** a count of work the module keeps, declared per fill call in the frontmatter (`fuel: <n>`), passed to it, and refused past (1). A braid fill must declare it; there is no default. **Fuel decides only whether it refuses, never which answer it gives**: anything that changes the answer (a beam width) is an argument written in the text (`countercell3(beam=8)`), part of what the piece is.
- **The deadline: 10 s** of wall clock in a worker. Past it, a refusal and a diagnostic, and the instance is dropped. Never a partial answer: a search stopped by a clock would answer differently on a fast machine and a slow one.
- **While it fills:** cells' default is that nothing plays and a diagnostic says "filling". A host may keep playing the previous answer, marked stale; the core is never written from a stale answer.
- **The lockfile records each braid fill's answer** beside the fragment's hash (054), keyed by its arguments' core. A piece opens playing its locked answer, a host verifies it when it can, and "stale" only arises while the arguments are being edited. Cells' own tools in Node (`toCore`, the snapshots) read the locked answer instead of searching on every run.

**3. Arguments in their core** (#749).
- **An argument is its core** (068, 069): references written in, sugar out, a flat braid in the core grammar, still text. Renaming a piece (L1) gives the plugin the same arguments.
- **The key is resolved:** an argument read `over=` a scale is passed with its scale as semitones, one more argument; the plugin holds no scale table. A key that moves (a stepped `&tonic`, a modulation) is **refused** for now, with a diagnostic.
- **The grammar is versioned:** cells publishes the core braid grammar a plugin receives as a page, its version named in the frontmatter (`wire: 1`); a core change that alters it bumps the version. Version 1 **refuses chance** (`?`, `[a|b]`) **and `free()`** in a braid fill's arguments: chance is drawn per lap from cells' seed, which a plugin can't reproduce.
- **A fill as an argument** is passed as its answer, in the order the fills depend on each other. A cycle is an error naming both fragments; a stream as a braid fill's argument is refused.

None of this moves an event snapshot: `fiveto12` takes no arguments, never refuses, and its fills are already called in order.

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
  - 1 (#693, landed): `fiveto12` answers `fill()` as text, built in, and realize plays its fills; `law=` is still read;
  - an issue of its own: `pan=` moves (§5; #696, landed);
  - "hole" renamed "fill", and `fiveto12`'s places through its voice's `pan=` (#727);
  - 3: the buffer and its numbers;
  - 4: the WASM runtime in Cell studio, with `fiveto12` ported to AssemblyScript and the same S1 hash over a day;
  - 5: the file form, `from` with fills, the clock as the main argument, a head a piece multiplies by its voice (decision 087: a named product with no voice is its parentheses, #745, landed), its places on a piece's voice (`pan=` on a line, #739), Migrate;
  - 6: braid fills (`necklace`, `spell(…)` as candidates), with §8: the refusal, fuel, the deadline, the answer in the lockfile, arguments in their core and the wire page (`wire: 1`);
  - 7: foreign plugin-fragments in both frontends, yggi/countercell the first (its phase 3 waits on 5 to 7).
- **A change a frontend notices:** `law=` warns once rung 5 lands, and Migrate rewrites it, as a minor version with the migration in `changes/`. `pan=` moving is an addition. Cell studio's `pluginView.ts` can read `lawOf` in place of `'fiveto12'` (yggi/cell-studio#638).
- **Not plugins:**
  - `scan`, `even`, `euclid`, `meter` and the waves are the foundation (072, 080).
  - The default performer (`perform/`) has a stream's shape one level up (077). It is a later question.
