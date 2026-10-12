# 026 · A cell can be a copy of another, changed where it says: base=

**Date:** 2026-10-12 · **Status:** proposed (the owner's syntax, on #307: "a syntax for overdubbing a cell: a
delta-copy of any other cell, prototype or template … `&foo base=&bar`") · Issues: #307, #10 (the examples pass, item
4: "a motif with a change"), #234

## Context

BWV 847 writes its subject seven times, because each entry changes one step (a tonal answer, a modulation) or holds the
last note longer. Nothing in the language says "this motif, with this step changed", so a fugue can't say what it is,
and the folder (#307 step 4) could fold only exact returns. The owner proposed `&foo base=&bar`.

## Decision

- **`base=&x`** (an attribute; `^$n` and `^n` allowed, no pick): the cell is a copy of &x.
- **Its braid is a delta over the base's, step by step** (a run `x!n` counting as n): `_` keeps the base's step,
  `_@n` keeps its pitch held n, `_!n` keeps n; a value replaces the step; what goes past the end is added; nothing
  written is the base as it is.
- **Transposition applies to what it keeps**, not to what it writes: the delta is written as it sounds. `^$n` on a base
  that reads a table is an error for now (grid steps after a table aren't a value change).
- **Attributes are inherited where the cell sets none**: `over`, `shift`, `step`, `map`, `stride`, `cycle`, `env`,
  `pitch`, `show`, `chance`, `seed`, `size` and a voice's parameters. Label, title, tags, about, laps, off are its own.
- **Resolved when parsed** (`parser/base.ts`): compile and everything after it see plain cells. A base of a base works;
  a cycle is an error on `base=`; an unknown base is the compiler's `Unknown cell`, as for any reference.

## Why

A copy with a delta is the smallest form that says "the same, except": the residual of a prediction (lifting's
predict and update, #234's disentangler), and what a folder can write when a phrase returns nearly the same. Resolving
it in the parser keeps the compiler, the graph and the engine as they are.

## Consequences

- The graph shows a copy as the plain cell it resolves to: no edge to its base yet (a follow-up: draw `base=` as a link).
- Free values (`free(…)`) in a base aren't copied as sliders of their own: the copy plays the base's written value.
- The folder writes variants this way (`engine/fold/variants.ts`); BWV 847 converted from MIDI has its subject as one
  cell and its bent entries as copies.
- Tier 5 of the tutorial teaches it with a new piece, *Variations* (`examples/variations.cells`).
