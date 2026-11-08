# 081 · A meter's swing may be moved by a cell, read at each bar line

**Date:** 2026-11-08 · **Status:** proposed (the owner on #597, 2026-11-08: "I lean towards also having swing as a cell"; this page's open questions are theirs to rule) · Issues: #597, #580, #566, #576

*Read with 078 (every number may be a `free()`; a cell moves only a number read while the piece plays), 079 (a sum of cells, a window), 080 (#612: a meter is a tree placed through a time map, `swing=` and `bend=` its two spellings) and [071](071-swing-leans-pairs.md) (a swing leans pairs).*

## Context

Decision 078's table of places lists a swing's share, `swing=8n:n`, as read while the piece plays but not yet moved by cells. It takes a number or a slider, `swing=8n:free(.6, .5...75)`, and refuses `swing=8n:&k`.

A swing is no structure. Decision 080 reads a meter as a tree placed through a time map, with the swing one of the map's two spellings. A swing moves when the notes of a bar start, never which notes there are. A clock's time map already changes while a piece plays: a motor or a belt bends it (`physics.ts`). So a swing moved by a cell is one more time map that changes, and 078's rule puts it among the places a cell may move.

What a moving swing needs is when it is read. A share read at any moment could place a pair's second note before its first, or depend on itself: a cell stepped by the meter it swings reads its value through that meter's swing.

## Decision

### 1. `swing=8n:&k` and `swing=8n:lo..hi * &k`

- A swing's share may be moved by a cell, as a sound's parameter is. A bare cell gives its values as shares (`&lean step=1m .55 .67`). A range scaled by cells puts the cells' 0..1 on the range (`swing=8n:.5...7 * &style[sync]`).
- Its ends may be sliders, and centre ± reach is its sugar (079): `swing=8n:free(.6, .5...75) ± .05 * &drift`.
- One level alone, as a share left free is today. Several levels moving is a later rung.

### 2. Read at each bar line, held through the bar

- The share bar *b* plays is the share's value at bar *b*'s start. It holds through the bar.
- **Why the bar line:** it is the one place no time map moves.
  - A swing leans within a beat, so every beat and every bar line stays where it is (`swingAt`).
  - A bend (080) keeps the bar's length, so a bar line stays where it is, but a beat doesn't.

  So a bar's start is the same whether its share is known yet or not. Reading there is exact, with no loop, even for a cell the same meter steps.
- **It is also the feel contract's grain:** a host hands its performer one swing a bar frame (`perform.ts`, `meterOfFrame`).
- **A share is held within the time map's bounds,** .05 to .95, as every share already is (`clocking.ts`). A range's ends lie within 0..1.

### 3. What reads it

- **The time map** (`clocking.ts`): a bar's knots are built for the share that bar plays, once for each share.
  - The meter's own steps and its taps (`swungMap`, `swungTapMap`, `swungMeter`) are placed through the bar's knots.
  - A note's end and a part of a step are placed through the knots of the bar they fall in.
- **The reading:** the plan (`realize.ts`) gives the clocks a reader of the share at a time, the cell read as any moving parameter's is (`paramAt`).
  - The series reads through the clocks, so while bar *b*'s share is being read, bar *b* is placed straight. That is exact at its start, by (2).
  - A clock read with no plan (a static reader) holds the share of (4).
- **The MIDI clock and the export** (#558) follow the swing per bar, as the time map does.
- **`toCore` and the fold** keep the moving share as written: a cell, never a number.

### 4. Where it is read with no time

The meter's drawing, `params.swing`, and anything that reads the meter before it plays read a held share:
- a range's first end;
- a bare cell's first value as written, or .5, straight, where it has none.

## Open questions (the owner's)

1. **The grain: the bar line** (recommended, (2)), or a beat's start? A beat's start is exact under a swing but not under a bend.
2. **The held share of (4):** a range's first end and a bare cell's first value (recommended), or .5, straight, always?
3. **A host's frame:** Jambot's performer is handed a swing per bar. Should cells export a reading of it, `swingOfBar(plan, meter, bar)`, for a host that builds its frames from a cells meter (yggi/jambot, checked at its pin)? Or does a host read the time map's knots?
4. **A bend moved by cells:** a bend's table is a list of lengths, and its nodes' starts move with it. Reading a moving one at the bar line would follow the same rule, the whole bar's lengths read at its start. Here, or a rung of its own (recommended)?

## Consequences

- **0 event snapshots move.** No text that compiles now reads differently, and `swing=8n:&k` was refused.
- **078's table:** the share's row moves from "not yet" to moving (`NUMBER_PLACES.share`, `numbers.test.ts`).
- **The cost:** the clock's knots per share, and the plan's reader handed to the clocks. Both touch the time map, so `npm run test:all` and CI's slow job are its check.
- **#566 and 080:** the rule, "a time map's numbers move at a bar line", is 080's time map read while it plays. The swing is its first instance, and a moving bend (4) would be its second.
