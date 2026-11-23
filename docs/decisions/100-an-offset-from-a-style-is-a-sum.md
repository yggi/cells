# 100 · An offset from a style is a sum: `style=[&acid + &(map=style bite=.1)]`

**Date:** 2026-11-23 · **Status:** accepted (the owner on #902, 2026-11-23: the meter fragment "should use named style points and offsets"; on #901, go ahead) · Issues: #901, #902, #572, #536 · Amends [089](089-the-association-in-the-text.md) §1 (what a point of `style=` may be)

*Read with [079](079-a-sum-of-cells-and-a-window.md) (a sum of cells) and [096](096-intensity-an-offset-the-levels-read.md) (an intensity is the song's plus its kind's offset, a sum).*

## Context

Several fragments sit at a style's point moved on one axis.
The energy offsets of #572 put a second motif 0.1 higher in bite than a style's first. The haunted harmony and pad sit 0.05 below Spooky in bite. The meter's sixteenths lean at Acid's point, 0.1 higher in bite.
They said so in prose and wrote the numbers, so the point stayed where it was when the style moved, and the prose could drift from the numbers: `peek` said "0.05 lower in bite", and its bite was Spooky's.

## Decision

1. **A point of `style=` may be a sum,** in brackets, as an intensity's is: `[&acid + &(map=style bite=.1)]`.
   - Its terms are names and inline points, two or more.
   - Each axis is the sum of the terms that name it. An axis that no term names is left out: an offset moves only the axes it names.
   - Each sum is held to 0…1, each axis' range, and rounded to 1e-9.
2. **A sum is a point like any other:** in a set `( a | b )`, with a weight `* w`, and on its facet's axes where decision 099 rules them.
3. **A term has no reach** (`± r`): a reach belongs to a whole point (089 §6).
4. **The seed fragments whose points are a style moved on one axis are written so:**
   - the motifs `refrain`, `pulse`, `soul`, `drift`, `dusty`, `slap`, `saudade`, `blue`, `lindy`, `toll`, `wail` and `peek`;
   - `haunted_progression`'s two points;
   - `haunted_pad`.
   Every point is where it was, to 1e-9. `peek`'s prose says what its numbers are.

## Why

- **The point follows its style,** as a named one does (089 §1): a style moved by #541's reader moves the fragments placed beside it.
- **The offset is written where it is meant,** and the prose can't contradict it.
- **One spelling with 096's sums**, read the same way.

**Why not** `&acid(bite=+.1)`: parentheses after a name are a template's arguments (065), and a style is no template.
**Why not** an offset attribute beside `style=` (`offset=&(bite=.1)`): it would apply to every point of a set, and a set's points each have their own offset.

## Consequences

- Every association is the same as before, to 1e-9, over the 223 fragments of the library. `npm run coverage` is the same.
- The rewritten fragments' texts change, so their hashes do: a piece's lockfile that recorded one plays the current version, with the usual warning.
- The meter fragment uses it (#902).
- Tests: `declarations.test.ts`.
