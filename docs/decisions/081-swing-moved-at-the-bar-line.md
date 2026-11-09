# 081 · A time map's amount may be moved by a cell, read at each bar line: a swing's share and a bend's depth

**Date:** 2026-11-09 · **Status:** accepted (the owner on #597, 2026-11-08: "I lean towards also having swing as a cell"; on the proposal's four questions, "all as recommended"; on the moving bend, "they should be a coherent pair", then, on the pair as below, "yes, very good analysis. amend and go ahead") · Issues: #597, #580, #566, #612, #576

*Read with 078 (every number may be a `free()`; a cell moves only a number read while the piece plays), 079 (a sum of cells, a window), 080 (#612: a meter is a tree placed through a time map, `swing=` and `bend=` its two spellings) and [071](071-swing-leans-pairs.md) (a swing leans pairs).*

## Context

Decision 078's table of places lists a swing's share, `swing=8n:n`, as read while the piece plays but not yet moved by cells. It takes a number or a slider, `swing=8n:free(.6, .5...75)`, and refuses `swing=8n:&k`.

A swing is no structure. Decision 080 reads a meter as a tree placed through a time map, whose two spellings are the swing and the bend. Either one moves when the notes of a bar start, never which notes there are. A clock's time map already changes while a piece plays: a motor or a belt bends it (`physics.ts`). So a time map moved by a cell is one more time map that changes, and 078's rule puts it among the places a cell may move.

Two things need ruling: what of a time map a cell moves, and when it is read.
- **What:** a bend's table is a list of lengths, read whole, and a cell read at a moment has one value, not a list. Read node by node, each length at its node's start, it would depend on the starts it moves.
- **When:** a share read at any moment could place a pair's second note before its first, or depend on itself, since a cell stepped by the meter it swings reads its value through that meter's swing.

## Decision

### 1. Each spelling is a level, a shape and an amount; the amount is what a cell moves

| | level | shape | amount, what a cell moves | none |
|---|---|---|---|---|
| `swing=` | `8n` | by rule: its pairs lean (071) | **its share**, `swing=8n:.67` | .5 |
| `bend=` | `4n` | by table: `&rubato` (080) | **its depth**, `bend=4n:&rubato:.5` | 0 |

- **The spellings line up:**
  - `swing=8n:&k` and `swing=8n:.5...75 * &k`;
  - `bend=4n:&rubato:&k` and `bend=4n:&rubato:0..1 * &k`.
- **Each amount is a number of 078's,** read by its one reader: a number, `free()`, a cell, or a range moved by cells, whose ends may be sliders, with centre ± reach its sugar (079).
- **Each in its own unit:**
  - a share is what a musician writes (042);
  - a depth is how far a written rubato applies, with `bend=4n:&rubato`, 080's form, the depth 1.
- **A shape doesn't move here.** A bend's table already spans bars as a tempo map (080). A cell adds how strongly the written shape applies, bar by bar.
- **A swing is no bend in disguise.** `bend=8n:&(2 1)` is `swing=8n:2/3` in 4/4. In 6/8, though, a table of two cycles across the groups of three, which 071 keeps straight. The two are one pair in form, not one in the other.
- **One level alone,** for each: several levels moving is a later rung.

### 2. A depth raises the table's ratios to its power

At depth *d* a node's length is its table's number to the power *d*, normalized so the bar keeps its length: `len_i ∝ t_i^d`.
- d = 0 is even, d = 1 the table as written, d = 2 exaggerates it.
- d = −1 inverts the rubato, the long nodes short, which a linear blend can't say.
- No depth makes a length 0 or less, so none is refused or clamped. Ratios compose as tempo does, by multiplying.
- On a table of two it lands near a share: depth .5 on 2:1 is the share .586, where a linear blend gives .583.

### 3. Read at each bar line, held through the bar

- The amount bar *b* plays is its value at bar *b*'s start, held through the bar.
- **Why the bar line:** it is the one place no time map moves.
  - A swing leans within a beat: every beat and every bar line stays where it is (`swingAt`).
  - A bend, at any depth, keeps its span's length (080), so the line of its span stays where it is, though a beat doesn't. Its span is the bar where its table fits one, and the bars its table spans where it is longer (a tempo map). Inside such a span the bar lines move with the depth, so **a bend's depth is read at each line of its span**, the bar line where the table fits a bar. (Amended at the bend's rung, #597: the first draft said a bend keeps every bar's length, which holds only for a table of one bar.)

  So a bar's start, or a span's, is the same whether its amount is known yet or not. Reading there is exact, with no loop, even for a cell the same meter steps. A bar with both reads them at the same instant, and they compose as 080 says, coarse to fine.
- **It is also the feel contract's grain:** a host hands its performer one swing a bar frame (`perform.ts`, `meterOfFrame`).
- **A share is held within the time map's bounds,** .05 to .95, as every share already is (`clocking.ts`). A depth needs no bounds, by (2).

### 4. What reads it

- **The time map** (`clocking.ts`): a bar's placement is built for the amount that bar plays, once for each amount.
  - For a swing: the meter's own steps, its taps, and a note's end or a part of a step, placed through the bar's knots.
  - For a bend: each span's positions at the span's depth (`bentSteps`, one layout for each depth).
- **The reading:** the plan (`realize.ts`) hands the clocks a reader of each amount at a time, the cells read as any moving parameter's are (`paramAt`).
  - The series read through the clocks, so while one bar's amount is being read, the other bars hold theirs (5). That is exact at the bar's start, by (3).
- **The MIDI clock and the export** (#558) follow it per bar, as the time map does.
- **`toCore` and the fold** keep a moving amount as written: a cell, never a number.

### 5. Where it is read with no time

The meter's drawing, `params.swing`, and anything that reads the meter before it plays (or with no plan) read a held amount:
- a range's first end;
- a bare cell's first value as written;
- where it has none, the amount's "none" (.5, 0).

## Consequences

- **0 event snapshots move.** No text that compiles now reads differently: `swing=8n:&k` was refused, and a bend's depth is new.
- **078's table:** the share's row moves from "not yet" to moving (`NUMBER_PLACES.share`), and a bend's depth gets a row of its own once 080 lands.
- **Built in two rungs:**
  - the swing's share, on `main` as it stands;
  - the bend's depth, on 080's `bentOf` once #612 lands (one set of a bar's positions for each depth).
- **A host's frame:** cells exports a reading of a meter's swing for a bar, `swingOfBar(plan, meter, bar)`, for a host that builds its frames from a cells meter (Jambot, checked at its pin).
- **The cost:** the clock's placement per amount, and the plan's reader handed to the clocks. Both touch the time map, so `npm run test:all` and CI's slow job are its check.
- **#566 and 080:** the rule is 080's time map read while it plays.
