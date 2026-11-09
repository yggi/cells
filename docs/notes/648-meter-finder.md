# A meter found from onsets: the first rung, measured

Date: 2026-11-09 · Status: open; the first rung, a constant tempo, is built and measured, and the next rungs are named below · Issues: [#648](https://github.com/yggi/cells/issues/648), its epics [#15](https://github.com/yggi/cells/issues/15) and [#35](https://github.com/yggi/cells/issues/35); it takes up [#40](https://github.com/yggi/cells/issues/40) · Code: `src/engine/time/cycles.ts`; measured by `tools/cycles.ts`, held by `tools/cycles.test.ts` and `tools/cycles.ratchet.json`

`findMeter(onsets)` reads a meter from when notes start, how strongly, how long and how low, and `meterText` writes it as cells does: `&bar from meter(grouping=…, swing=…) &tempo`.
The module's header says how; this note says what it finds, and what it can't.

## The benches

Run: `node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/cycles.ts [bench …] [--rows]`.

- **examples**: the 55 examples with a fixed meter (written `meter(…)`, not bent, moved or a slider), their first 40 s as played; the truth is the meter the text writes.
- **synthetic**: a drum pattern (a low kick on the bar line, a kick on each other group, a snare on the last, a hat on every eighth) over each of `contracts/meter`'s groupings up to 12 eighths and 4 groups, at 80, 110 and 150 bpm, straight, swung .6 and swung 2/3: 1035 cases with an exact truth, aksak and swing among them.
- **groove**: the three Groove MIDI fixtures, played; the truth their tempo map, and their swing as `tools/groove.ts` reads it.
- **bach**: the MIDI library's 88 files, typeset, with no velocities and some pickups; the truth each file's time signature, its bars from its start.

What each finds, per measure, is `tools/cycles.ratchet.json`; a measure may rise, never fall.
On 2026-11-09 (this branch's first commit):

| bench | beat | bar | bar or ×2, ÷2 | start | beats | groups | swing |
|---|---|---|---|---|---|---|---|
| examples (55) | 46 | 45 | 46 | 41 | 45 | 42 | 52 |
| synthetic (1035) | 451 | 733 | 855 | 478 | 495 | 221 | 783 |
| groove (3) | 3 | 3 | 3 | 2 | 3 | 3 | 3 |
| bach (88) | 42 | 35 | 66 | 28 | 53 | 25 | 88 |

## Against #648's bounds

- **The Groove fixtures' swing within .03: met**, 3 of 3. Their tempo, bar, beats and grouping too; the bar's start on 2 of 3.
- **The examples’ signature and swing exact on 90 %: not met.** The grouping is right on 42 of 55 (76 %), the swing on 52 (95 %).
- **The MIDI library: not met.** Its beats a bar are right on 53 of 88 (60 %, the bound 80 %), its bar's start within a beat on 28 (32 %).

## What it can't know, and chooses

- **A strictly repeating bar is one bar or two.** A pattern that repeats each two beats sounds the same written 2/4 or 4/4; the prior on a bar's length (2.4 s, `BAR_PRIOR`) takes 4/4, as the examples are written. The synthetic bench's 2/4, 6/8 and 5/8 lose to it: the `bars` column counts a bar found double or half, 855 of 1035 where `bar` counts 733.
  The one exception is a rule, not the prior: a bar whose halves are the same and whose half groups its beats in twos and threes is two bars of aksak (a doubled bar can't spell 2+3+3).
- **A tempo is one or its double.** `prelude` at 66 bpm is found at 132, its bar half the written one; `breve`'s 2/2 at 60 as 4/4 at 120. Both sound the same; only the writing differs.
- **A swing near 2/3 is a triplet grid.** `electroswing`'s .64 is found as 12/8: its swung eighths sit within the written grid's 12 ms of the triplets.

## What the Bach bench needs (the next rung for it)

Typeset Bach has no accents but the notes themselves. The finder weighs an event by its notes, their length and how low they lie; a bar's line in Bach is told by where the harmony changes and where the long notes fall, which it doesn't read yet. Temperley's model (*The Cognition of Basic Musical Structures*, 2001, ch. 2) weighs both; it is the candidate.

## The next rungs (#648)

- A tempo curve: the grid refitted over a window that moves, for a performance that speeds up or a `free()` tempo moved.
- A bend: a level's nodes unequal and repeating, written `bend=` (decision 080).
- Its readers: `midiimport` writing the meter in place of a flat tempo scan (#44's size; the fold ratchet's jazz, five and coltrane, #660), Fold and Shorten's hints (#158), Cell studio's TimeView, Jambot's `estimateSwing`.
- Audio: an onset flux from `spectrogram.ts` as its onsets.
