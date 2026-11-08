# 078 · Every number may be a `free()`; a number read while the piece plays may also be moved by cells

**Date:** 2026-11-08 · **Status:** accepted (the owner on #580, 2026-11-08: "any number can be a free() or a cell?"; on the rule proposed, "yes") · Issues: #580, #576, #26

*Read with [068](068-the-core-grammar.md) (`free()` is core), [018](018-free-braid.md) (a braid left free) and [066](066-a-wave-and-an-envelope-move.md) (what moves at each note).*

## Context

`free.md` said `free(default, lo..hi)` "goes anywhere a number goes". It went to about half of them. Nine callers of `parseFree` each handled one kind of place, and the rest read a plain number. The table on #580 counts 15 kinds of place. In about half, `free()` was an error, and in most, a cell was refused with an error that named nothing.

## Decision

### 1. `free()` is the text's: it goes wherever a number is written

A slider rewrites the number in the code, and the piece compiles again. So it belongs wherever a literal does, whatever reads the number and whenever.

- **One reader.** The scanner reads every number through `LineScanner.free(place)` before its own literal (`num` and `int` call it themselves). A *place* is one row of `NUMBER_PLACES` (`src/engine/parser/numbers.ts`). A place has its form, its slider's name and its key, and whether it is whole. It also has the least and the most a slider's range may reach there. The nine special cases go.
- **A structural number** (`cycle=`, `!n`, `&x[$i]`, `euclid(k, …)`, `map=edo(n)`) is the number its `free()` holds now. Moving the slider recompiles, as `shift=` and `stride=` already did.
- **A whole place** (a count, an index, a turn) takes a `free()` with a whole range, and rounds its value, as `shift=` always did. A slider that moves by less than one, as a frontend's may before it reads `whole`, still compiles. Its spec carries `whole`, so a frontend's slider can move by ones. At `shift=`, `stride=` and a scale's tonic the range isn't checked either, as before (a text that compiled compiles the same).
- **The range is checked against the place's.** A count's slider stays at 1 or more and a probability's within 0..1. So no position of the slider makes a text that doesn't compile.
- **A tempo marking is a rate's.** `free(andante)` is refused at a whole place, as it already was at a shift, a gain and a tonic. Where a parameter took it before, it still does: nothing that compiled stops.
- **Two numbers stay plain**, as their places say:
  - `tier=` is the tutorial's order, not the piece's.
  - a hit's number, `&x:0`, is 0 until a hit is pitched.

  `size=`, the drawing's alone, takes a `free()` like any other number. Nothing is lost by it, and one exception fewer.

### 2. A cell is the playing's: it moves only a number read while the piece plays

A range moved by cells (`&k`, `lo..hi * &k`) is read while the piece plays. So it belongs only where a number is read while playing: sound parameters, an envelope's slots, a gate's level, a gain in a mix, a scale's tonic (a note), and a braid's steps, where a cell is spliced.

- **A structural number moved by a cell** would make the program's shape change while it plays. That is the selectors' work (#51), not a value's, so it stays out. The error names the rule: *read as the piece is built: a number, or free(v, lo..hi) … a cell moves only a number read while the piece plays (decision 078)*.
- **A number read while playing but not yet moved by cells** is refused with the rule and what the place takes of cells:
  - a style's axis (#576's next rung);
  - a swing's share;
  - a hit's gain;
  - a style's weight;
  - a range at a gain in a mix or at a tonic;
  - a bare cell at an envelope's slot.

  Each is a rung of its own, and needs no change to this rule.
- **Which sound parameters can move** (`pan=` and `postgain=` can't) is the renderer's question, unchanged here.

### 3. The table is generated

`free.md`'s table of where a `free()` and a cell go is written from `NUMBER_PLACES` by `npm run reference`, so it can't drift from the parser. `numbers.test.ts` reads each place with each of the four spellings (a number, `free()`, `&k`, `lo..hi * &k`). Each is accepted, or refused with the rule.

## Consequences

- Every text that compiled compiles the same: 0 event snapshots move. Two errors change wording. A `free()` in a pick, `&x[free(1, 0..3)]`, used to be refused and is now a pick left free. A cell at a structural number now names the rule.
- `free(2, 0..7)` among a braid's steps is a step left free. `free(0 2 4 ~)` is still a braid left free, the cell's whole braid (018). Its first argument followed by a comma tells them apart.
- `FreeSpec` gains `whole?: true`. A frontend that ignores it draws a whole place's slider as a number's, rounded by the text.
- A frontend draws the new sliders as it draws any `free()`, by its key and its `param`, and the new places are all key `'param'`.
