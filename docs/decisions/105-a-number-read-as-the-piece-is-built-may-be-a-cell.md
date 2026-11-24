# 105 · A number read as the piece is built may be a cell: one reader, one hole, one phase

**Date:** 2026-11-24 · **Status:** accepted (the owner on #930, 2026-11-24: "go for 930, separate PR. use it as a pass to clean up and generalize … work toward the goal: clean and consistent handling of literal values and ones referenced/generated through cells everywhere, with one general mechanism behind it"; then "go ahead, split as suggested": the attributes in this decision, the braid's places the next rung) · Issues: #930, #782, #576

*Amends [078](078-every-number-may-be-free.md) (a cell where a number is read as the piece is built), [093](093-a-generator-reads-a-cell-that-is-one-number.md) and [101](101-a-text-cell.md) (their one mechanism, written once). Read with [088](088-naming-a-number-plays-as-the-number.md) (a cell that is one number), [096](096-intensity-an-offset-the-levels-read.md) (a sum of numbers alone is a value) and [098](098-a-seed-the-cell-writes.md) §4 (cells that write the same seed draw alike).*

## Context

A number can be written (`seed=7`), left to a hand (`seed=free(7, 0..99)`) or named (`seed=&s`). 078 gave a cell only the numbers read while the piece plays; 093 and 101 made one exception after another for the numbers read as the piece is built, one form at a time: `even`'s arguments, every generator's value arguments, `scale(&mode)`, a tonic, a step's rate. Each had its own reader, its own wording of what it reads, and its own fill. The attributes (`seed=`, `shift=`, `stride=`, `cycle=`, `laps=`, `chance=`, `size=`) had none, so **a template that draws at random could not be taken twice with independent dice** (#930): `seed=&s` was refused, and a copy of a template "keeps its one seed" (098 §4), so the `wander` module for four style axes moved them together.

## Decision

1. **A number read as the piece is built may be a cell, wherever the place says it fills one.** The place reads `&k` as it reads the number written: a cell that is **one number** (088), or **a sum of numbers alone** (096), so a number may be generated through cells (`&seed1 [&seed + 1]` is 8 with `&seed 7`; a chain of them too). A cell with a slider reads as the slider's value now (`&k free(7, 0..99)` is 7), and the slider stays the cell's. Anything else is an error that names the place and what is read: a table, a stepped cell (not yet a form), a cell in a cycle, a number the place doesn't take (not whole, outside its range).
2. **One mechanism, in three parts:**
   - **One reader** of a cell's built value (`compiler/built.ts`: `builtNumber`, over `constantOf` in `valuesum.ts`), read by every phase that fills: the attributes below, a generator's value arguments (101, `meters`), and `even`'s (093, `evens`). One wording: `&k is read as seed=: a cell that is one number, filled as the piece is built (&k 3)`.
   - **One hole in the parser.** The scanner's one number reader (`LineScanner.free`) is where a place meets `&k`: a place that fills cells (`NUMBER_PLACES`, its `fills` field: the attribute it sets and the number the line holds until compile fills it) records a `BuiltHole` and goes on; every place the reader serves has it.
   - **One phase** (`builtHoles`, before the generators') sets the attribute to the cell's value, checking the place's own limits (whole, `min`, `max`), and notes the cell in the declaration's `valueReads` (the written graph draws its wire).
3. **The places that fill cells now:** `seed=`, `shift=`, `stride=`, `cycle=` (to the most steps a cell holds), `laps=`, `chance=` (0 to 1), `size=` (.25 to 4). `chance` and `cycle` gain the limits their readers kept: a slider's range was checked by the reader; a cell's value is checked by the place.
4. **The next rung, and what stays:** the braid's places (a count `x!n` `x@n` `x*n` `x/n`, `x?p`, `x(k, n, r)`, a pick, a turn, a move, a hit's number), `step=&bar*n`, a scan's intervals and `map=edo(n)` are still read as the piece is built and refuse a cell: a hole in a braid is a token to read again, not an attribute to set, and is its own rung. A range moved by cells (`lo..hi * &k`) is still the playing's only.

## Why

- **One rule instead of an exception per form** (the owner's mantra: generalization, do more with less). The reader, its message and its limits were written five times; they are written once, and a place that gains cells gains them by one field.
- **A template takes any built number as it takes a jack** (065 §5: an argument is a cell): `ticks(seed=&a)` and `ticks(seed=&b)` draw apart, with the same seed alike (098 §4 holds), a seed the copy isn't given is the template's own.
- **Generated through cells** is the sum of 096 read where the piece is built: one place for "a number that is computed from numbers", at no new spelling.
- **Related, #782:** the kinds' table says what a cell is (`number`, `sum`, `text`); this says what each position reads of one. The table of places (078) and `VALUE_ARGS` (101) are its dual.

**Why not** read any cell where the number is built: a table or a stepped cell has no one value, and a stepped one would change the program's shape while it plays (078, 093).
**Why not** a `seed` argument of its own for templates: a seed is one of seven numbers read as the piece is built, and the sixth and the seventh would each be asked for next.

## Consequences

- **No event snapshot moves**: a cell at these places was an error; nothing a text means today changes. Every example compiles as it did.
- **078's table** states the seven places' policy, generated in `free.md`; `NumberPlace` gains `fills`.
- **`wander`** takes a seed after #933 (a jack `&seed` its six noises read as `seed=&seed`, and its generated seeds `&seed1 [&seed + 1]`).
- **A frontend** sees the same compiled cells; a text that wrote `seed=&s` was refused before, and plays now.
