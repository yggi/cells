# 089 · A generator's argument may read a cell that is one number, filled as the piece is built

**Date:** 2026-11-14 · **Status:** accepted (the owner on #531, 2026-11-14: the rule over every generator argument, rung 1 `even()` and `scale(table, tonic)`; a mode's name outside the diatonic an error; a stepped phase at the bar line, 081's rule, the next rung) · Issues: #531, #507, #363

*Amends [078](078-every-number-may-be-free.md) (a cell where a number is read as the piece is built). Read with [088](088-naming-a-number-plays-as-the-number.md) (a cell that is one number), [072](072-even-is-the-foundation.md) (`even` is the foundation, the names its sugar) and [081](081-swing-moved-at-the-bar-line.md) (an amount moved by a cell, read at each bar line).*

## Context

Decision 078 sorts a number's places into two kinds. A number read while the piece plays may be moved by a cell. A number read as the piece is built may be a `free()`, whose slider compiles the piece again, and refuses a cell, because a cell there would change the program's shape while it plays.

A third kind of hole already existed, one form at a time: a cell read once, as the piece is built, holding a constant. `scale(&mode, …)` (#363), `scale(…, &tonic)` (#290), `spell(…, &table, …)`, `step=&tempo` and `swing=&swing` (#308) each read one. It is how a fragment leaves an argument to the text that uses it. Every other generator argument refused it, so `diatonic` could not write its scale as the necklace it is, `even(7, 12, &mode)` (#531).

Decision 088 gives the unit such a hole reads: a cell that is one number and nothing else.

## Decision

1. **A generator's number argument may read a cell that is one number** (088), filled as the piece is built: `even(7, 12, &mode)` with `&mode 3` is `even(7, 12, 3)`. Its `free()` slider compiles the piece again, as 078's do. The table's size is fixed once the piece is built.
   - The rule covers `even(k, n, phase)`, `euclid(k, n, r)`, the waves (`sin(n)` …) and `fifths(n)`. Each is built when a text asks for it; `even` is the first (#531).
   - It doesn't cover a scan's intervals (a cell among them reads as a table, 088 §3), a choice's index or a braid's counts, picks and turns (a selector's, #51), or Strudel's own `x(k, n, r)` (027).
2. **What is more than one number is an error that says what is read:** a table of several, a line with a clock. **A stepped cell is not yet a form.**
3. **A diatonic mode's name is a phase of the diatonic necklace, `even(7, 12)`, alone.** `even(7, 12, &mode)` with `&mode dorian` is phase 3; in any other necklace, or as a size, a mode's name is an error that names the number to write (`even(5, 12, …)`: write 3). The language names no other necklace's modes, and phase 3 of the pentatonic is no scale anybody calls dorian. A name written in place (`even(7, 12, aeolian)`, as a fragment's argument writes it) reads the same.
4. **`scale()` takes a table where it takes a name:** `scale(even(7, 12, &mode), &tonic)`, `scale(scan(2 1 2 2 1 2 2), D)`. A name is sugar for its table, 072's order: `scale(dorian, D)` is `scale(even(7, 12, 3), D)`. Any necklace is a key, its mode from a cell: `scale(even(5, 12, &p), &tonic)`.
5. **The next rung (081's rule for pitch):** a stepped phase read at each bar line and held through the bar. A phase keeps the table's size, so it can move while the piece plays; `k` and `n` never step, since a size that moves is a selector's.

**Why not** let every built number read any cell: a cell that is a line or a table has no single value, and a stepped one would change the table's shape while it plays.
**Why not** read a mode's name as its phase in any necklace: the language has no names for the pentatonic's modes, and a silent reading would play a scale the word doesn't name.
**Why not** keep `scale(&mode, …)` the only way: it is a special case of the rule, and it names only the diatonic.

## Consequences

- **`diatonic`** writes its key `scale(even(7, 12, &mode), &tonic)`. Every example plays what it played (the event snapshots don't move).
- **078's table** gains a row, `even(k, n, phase)`'s arguments, generated in `free.md`.
- **The parser** reads `even()`'s arguments as numbers, cells or a mode's name; **the compiler** (`declare.ts`, `evens`) reads the cells and sets the steps, as `modes()` does for `scale(&mode)`.
- **A frontend** sees the same steps once compiled; a scan braid may carry `even` (its arguments) before it is.
- **Open:** the stepped phase (rung 2); the even rhythms struck by phase, each hit its own length (rung 3, #531's first comment); `euclid`, the waves and `fifths` when a text asks.
