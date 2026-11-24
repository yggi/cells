# 106 · The hole is a line read again: every place that reads a number as the piece is built may read a cell

**Date:** 2026-11-24 · **Status:** accepted (the owner on #936, 2026-11-24: "go ahead with 936"; and on #930, "clean and consistent handling of literal values and ones referenced/generated through cells everywhere, with one general mechanism behind it") · Issues: #936, #930, #782 · Amends [105](105-a-number-read-as-the-piece-is-built-may-be-a-cell.md) (its fourth point, done here, and its setter, replaced)

*Read with [078](078-every-number-may-be-free.md), [088](088-naming-a-number-plays-as-the-number.md) (a cell that is one number), [093](093-a-generator-reads-a-cell-that-is-one-number.md), [096](096-intensity-an-offset-the-levels-read.md) (a sum of numbers alone is a value) and [101](101-a-text-cell.md).*

## Context

Decision 105 gave the seven attributes (`seed=` `shift=` `stride=` `cycle=` `laps=` `chance=` `size=`) a cell where a number is read as the piece is built, by a hole that **set a field** of the declaration. That was the right mechanism for a field and the wrong one for the rest: a count `x!n`, a probability `x?p`, a pick, a turn, a move, `x(k, n, r)` are parts of a token; a rate's factor `step=&clock*n`, a grid's size `map=edo(n)` and its ratio, `fifths(n)` are parts of a value. Each would have needed a setter of its own, and **a setter per place is the exception per form that 105 was written to end**.

## Decision

1. **A hole is where a cell's name stands in a line.** A place that fills cells reads `&k` with a placeholder and the scanner records the text range of the name (`BuiltHole`: from, to, the cell, the place), at its place in the *line*, however deep the unnamed cells (`&( … )`) it was read in. The line keeps its text and the names of the unnamed cells it declared (`CellDecl.built`).
2. **One phase reads the line again** (`fillBuilt`, `compiler/built.ts`), the first of a compile, before the slots and the styles are read: each hole's cell is read through the one reader (`readBuilt`: a cell that is one number, or a sum of numbers alone, 105), checked against the place's own limits, written into the text, and the whole line parsed again. So a place reads a cell *exactly* as it reads the number written, and no place has a reading of its own. The line it hands on is the line a text of the number would have made; its spans are given back where the line was written, so a `free()` slider later on the line still rewrites its own text.
3. **A line that fails only for its placeholder is read again, not refused:** euclid's `k` over its `n` (`0(3,&k)`) fails at `n` = 1; a line that read a cell and failed is kept as a blank cell with its text, and says its error, with the line as filled, if it still fails once the value is in. A cell no line declares, or a fill not answered yet, leaves the line as it is: it is the text's, a template's, hole (`unreadHoles` says it as any unknown cell).
4. **The places** that fill cells now: the seven attributes of 105 and a count (`x!n` `x@n` `x*n` `x/n`), `x?p`, `x(k, n, r)`, a pick `&x[n]`, a turn `&x[<<n]`, a move `&x^n` `degree(&x, n)`, a rate's factor `step=&clock*n` and `/n`, `fifths(n)`, `map=edo(n)` and `map=ed(n, r)` (`NUMBER_PLACES`' `fills`). A place states which: its placeholder, and how a message names it.
5. **What stays, and why:** a scan's intervals, their repeats and `geo(…)`, where a cell among the steps already reads as a table (088 §3); a hit's gain and a hit's number, a weight, which are numbers by their own rule (their `cell` column says it). A generator's value arguments (101) still read through their own deferred call (`parseGeneratorCall`, `meters`), and `even`'s (093) and a mode's, a tonic's, their own readers: the next rung moves them onto the line (a text cell is a text hole).
6. **`base=`** and a cell read as the piece is built are not yet one line (`applyBases` reads the line at parse time): an error that says to write the number.

## Why

- **One mechanism, written once:** the reader, the limits, the phase and the line's re-read serve every place; a place gains a cell by one field of its row in the table (`fills`). 105's per-attribute setter and its `field` are gone.
- **The line is the construct that is always there:** a token, a rate, a value or an attribute is a part of a line, and a line has a reader. Reading it again is what 101 did for a generator's call, for the whole line.
- **The same line** as the number's means every tool that reads text sees the same text as before, and nothing reads a placeholder after compile begins.

**Why not** a setter per field and a token re-read for the braid: five mechanisms in place of one, and each would have its own error wording.
**Why not** a hole in the braid that carries the cell and reads it at play: a count changes how many steps a token takes; that is shape, the selector's work (078, #51).

## Consequences

- **No event snapshot moves:** a cell at these places was an error before.
- **`free.md`'s table** states each place's policy, generated from `NUMBER_PLACES`; a place whose cell column says `fills` reads a cell.
- **A frontend** sees the same compiled cells; `CellDecl.built` and `BuiltHole`/`BuiltLine` are the parse's, kept on a line only while a cell it reads is unread.
