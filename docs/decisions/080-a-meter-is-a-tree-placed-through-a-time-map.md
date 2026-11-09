# 080 · A meter is a tree placed through a time map: `bend=` bends a level's nodes, and a meter scan is its sugar

**Date:** 2026-11-08 · **Status:** accepted (the owner on #566, 2026-11-08: "go ahead", on the proposal and again to build it) · Issues: #566, #482

*Read with [068](068-the-core-grammar.md) §2 (soft time, the ramp), [069](069-compile-writes-the-core.md) (the core), [077](077-the-core-is-sound-up-to-an-interface.md) (which ruled a meter scan core: amended here), [040](040-pulse-beat-and-laps.md) (pulse, beat, laps) and [071](071-swing-leans-pairs.md) (swing).*

## Context

The core had two meter forms, neither containing the other (#566):
- **`meter("…")`** is graded and even: a level per step (`*.-.+.-.`), every step a pulse.
- **`scan(…)` with a rate** is uneven and flat: `scan(27 23 26 24)`, every entry a beat at level 1.

So a meter both uneven and graded had no spelling, and `toCore` kept both as primitives (077).

Read from the compiler, the two differ in kind, not in spelling:
- **A `meter(…)` is the tree:** nominal grouping and levels, what is counted. 7/8's 3+2+2 eighths are three beats of unequal *nominal* length.
- **A scan's numbers are a time map,** not nominal lengths. Its entries are equal pulses played at relative lengths, through the same `TimeMap` a swing is. A tap leans within its bent beats: in `scan(3 3 2)`, a `16n` tap gives four sixteenths in every entry (4+4+4), where `meter("3+3+2")` gives 6+6+4.

A scan is a flat tree placed through a bend.

## Decision

### 1. A meter is a tree placed through a time map

- **The tree** is `meter("levels", note)`: nominal, graded, each step a pulse. Groupings, signatures and levels are its spellings.
- **The time map** is soft time (068 §2). It has two spellings, which compose, coarse to fine:
  - `swing=` bends one level's pairs by rule (071);
  - `bend=` bends one level's nodes by a table.

### 2. `bend=<note value>:&table`

- **What it does:** the nodes of the level named by note value, `4n` in `meter("*.-.+.-.")` being its beats, take the table's numbers as their relative lengths, in turn. Each node's steps are even within it, and a tap of a finer value leans within the bent nodes, as a scan's taps did.
- **What it keeps:** the bar's length (its steps at the meter's rate), so `bpm` counts as before.
- **The table** is a cell like any other: counts (`1!432`), sliders (`free(2, 1..3)`), and an inline `&( … )`.
- **A table longer than the bar** spans as many whole bars as hold it, cycled at the least number that does: a tempo map. `meter("+") bend=4n:&(2 1 1)` bends three bars, 2:1:1.
- **Where it can't apply** (the bar has no whole number of the level's nodes, or a length isn't above 0), it says so and bends nothing.

A bent 4/4 whose eighths are tapped by level, the form #566 found missing, is `meter("*.-.+.-.") bend=4n:&rubato`.

### 3. A meter scan is its sugar

- `&bar scan(27 23 26 24) step=r` is `&bar meter("++++") step=r bend=4n:&b` with `&b 27 23 26 24`: every entry a beat at level 1, as `meterOfScan` made it.
- **With `pulse=`,** the bar is one beat of the pulse's note value, and the bend spans what the scan held, `laps=` counting the beats. BWV 847's tempo map, `scan(1!432 .72!96 …) pulse=16n laps=1`, is `meter("+,,,", 16n) laps=280 bend=16n:&map`.
  - Written in its own 4/4, `meter("*,,,+,,,+,,,+,,,", 16n) laps=70 bend=16n:&map`, it is exact too, 35 characters longer than the scan.
- **`toCore` writes every meter scan so** (the `meter scans` family), each rewrite checked by S1.
  - A scan that is also a table (`&f over=&d`) gets its table as a cell of its own (`&_t1 scan(…)`).
  - A scan walked as a table by `step=cycle(&key)` (Royal's), its positions both its pitches and its times, stays and is reported.
- **A scan stays in the language as sugar,** short to write. Nothing migrates.

### 4. The core's meter

`meter("levels", note)`, `swing=` and `bend=`. `scan(…)` with a rate leaves the core's primitives: 077's ruling on it is amended. A nominal uneven grouping is the tree's: `meter("3+3+2")`, never a scan.

## Consequences

- **Measured over the examples:**
  - all 19 with a meter scan are written so, S1-exact, but Royal's;
  - `toCore` stays idempotent and is still its normal form's core;
  - no event snapshot moves;
  - the examples are written as before, so the structure measure doesn't move.
- **The core is longer:** BWV 847's by 0.4 %, a short one by up to 10 % (Studie). `meter("++++") bend=4n:&_s1` and its table's line are longer than `scan(…)`, for one primitive fewer.
- **The compiler:** a meter with `bend=` is a positional clock, its steps' starts over the bars its table spans (`ResolvedCell.bend`). A meter scan's clock read its entries the same way. A bent meter stepped by another's tap is a meter of its own, as a scan is.
- **068 §1 and 077 §1 are amended:** a scan with a rate is the sugar of a meter bent.
