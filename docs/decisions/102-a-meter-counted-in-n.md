# 102 · A meter counted in n beats: `meter("4/4 in 2")`, the signature's tree, its beats the tier that has n

**Date:** 2026-11-23 · **Status:** accepted (the owner on #902, 2026-11-23: "we already reached the conclusion that sometimes the beats have to be given separately", the beat count suffixed to the string; then, on the spelling, "'4/4 in 2' is very good, spelling accepted") · Issues: #902 · Read with [072](072-even-is-the-foundation.md) (a meter is two applications of `even`), [080](080-a-meter-is-a-tree-placed-through-a-time-map.md) (a meter is a tree) and [101](101-a-text-cell.md) (a text cell)

## Context

A meter's beats came from its signature by rule (072): 4/4 four quarters, 2/2 two halves, 6/8 two dotted quarters, 12/8 four, 7/8 three (3+2+2).
Its second argument, `meter("2/2", 2)`, sets steps a pulse, not beats.
So the same tree counted another way had no spelling but its levels written out, with a note value: a waltz in one was `meter("*..", 4n)`, alla breve `meter("2/2", 2)` or `meter("*,.,+,.,", 8n)`.
The meter fragment, renamed `bar` with its grouping a text argument (`bar(meter="3/4")`, 101), takes one text, so alla breve's `, 2` had no place in it.

## Decision

1. **`meter("sig in n")` counts the signature's tree in n beats**: `"4/4 in 2"`, `"3/4 in 1"`, `"12/8 in 2"`, `"6/8 in 6"`. It works on a signature or sizes (`"2+2+3 in 1"`).
2. **The tree is the signature's:** its steps and their grades as written. Only its beats change, to the nodes of the tier of its tree that has n, each beat that node's length (`meterCounts`, `parser/generators.ts`).
   - The tiers that count are at or above the pulse: 4/4 1, 2 or 4; 3/4 1 or 3; 6/8 1, 2 or 6; 12/8 1, 2, 4 or 12; 10/8 1, 2, 4 or 10; 7/8 1, 3 or 7 (three groups under the bar are flat: no tier of two).
   - So bpm counts the new beats, and a tap of the beat (`step=&bar:beat`) steps by them.
3. **A count no tier has is an error that lists those it has:** `meter("3/4 in 2")` says "3/4 is counted in 1, 3, …, not 2".
4. **A meter's own count is the signature alone:** `"4/4 in 4"` is `"4/4"`.
5. **Levels written out count by their marks** (`+ - : ;`), so `"*.+. in 1"` is an error that says so.
6. **It is a text,** so a text cell (`&m "4/4 in 2"`) and a fragment's text argument (`bar(meter="4/4 in 2")`) carry it as `meter("…")` does.

## Why

- **Counting is the performer's, the tree the music's:** alla breve, a waltz in one and 12/8 in two are the same bars felt in fewer beats. A tier of the tree is the only honest choice of beat, and the error shows the choices.
- **"in 2" is what musicians say** ("in one", "in two"). `$` already moves pitch (`&x^$1`), and a second argument already means steps a pulse.
- **Alla breve needs no second argument**: `meter("4/4 in 2")` plays as `meter("2/2", 2)`, event for event.

**Why not** a beat argument (`meter("3/4", beats=1)`): a generator has no named arguments, and a fragment's one text argument couldn't carry it.
**Why not** retiring `meter("2/2", 2)`: it is a different tree (two pulses of a half, each two steps), which plays the same. Which of the two Normalise writes is a row of the canonical table (#27), not this decision.

## Consequences

- `meter("4/4 in 2")` is `meter("2/2", 2)` and `meter("3/4 in 1")` is `meter("*..", 4n)`, event for event. Their compiled meters differ in pulses and unit only where the trees do.
- A `free(…)` choice of meters lists its labels by spaces, so it can't offer "4/4 in 2" yet.
- No example's or fragment's events move.
- Tests: `counted.test.ts`.
