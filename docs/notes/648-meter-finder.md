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
On 2026-11-09, with the bar line's cues of harmony and length (below):

| bench | beat | bar | bar or ×2, ÷2 | start | beats | groups | swing |
|---|---|---|---|---|---|---|---|
| examples (55) | 46 | 45 | 46 | 41 | 44 | 42 | 52 |
| synthetic (1035) | 458 | 733 | 864 | 484 | 496 | 226 | 785 |
| groove (3) | 3 | 3 | 3 | 2 | 3 | 3 | 3 |
| bach (88) | 42 | 40 | 73 | 33 | 57 | 30 | 88 |

## Against #648's bounds

- **The Groove fixtures' swing within .03: met**, 3 of 3. Their tempo, bar, beats and grouping too; the bar's start on 2 of 3.
- **The examples’ signature and swing exact on 90 %: not met.** The grouping is right on 42 of 55 (76 %), the swing on 52 (95 %).
- **The MIDI library: not met.** Its beats a bar are right on 57 of 88 (65 %, the bound 80 %), its bar's start within a beat on 33 (38 %).

## What it can't know, and chooses

- **A strictly repeating bar is one bar or two.** A pattern that repeats each two beats sounds the same written 2/4 or 4/4; the prior on a bar's length (2.4 s, `BAR_PRIOR`) takes 4/4, as the examples are written. The synthetic bench's 2/4, 6/8 and 5/8 lose to it: the `bars` column counts a bar found double or half, 855 of 1035 where `bar` counts 733.
  The one exception is a rule, not the prior: a bar whose halves are the same and whose half groups its beats in twos and threes is two bars of aksak (a doubled bar can't spell 2+3+3).
- **A tempo is one or its double.** `prelude` at 66 bpm is found at 132, its bar half the written one; `breve`'s 2/2 at 60 as 4/4 at 120. Both sound the same; only the writing differs.
- **A swing near 2/3 is a triplet grid.** `electroswing`'s .64 is found as 12/8: its swung eighths sit within the written grid's 12 ms of the triplets.

## The downbeat in typeset music: a first iteration

Typeset Bach has no accents but the notes themselves.
Temperley (*The Cognition of Basic Musical Structures*, 2001, ch. 2) has a strong beat prefer a change of harmony, a long note and a move of the bass.
Measured over the library's 4/4 and 3/4 files, each cue's mean on each beat of the written bar:

| | beat 1 | beat 2 | beat 3 | beat 4 |
|---|---|---|---|---|
| 4/4, low notes' accent | 1.40 | 0.98 | 1.28 | 1.01 |
| 4/4, new pitch classes (share) | .55 | .47 | .51 | .46 |
| 4/4, longest note (log₂ of its length over the median, plus one) | 1.91 | 1.64 | 1.86 | 1.63 |
| 3/4, low notes' accent | 1.09 | 0.80 | 1.05 | |
| 3/4, new pitch classes | .67 | .52 | .57 | |
| 3/4, longest note | 1.63 | 1.33 | 1.39 | |

- **In 3/4 the cues tell the bar's first beat.** New harmony and long notes stand out on it.
- **In 4/4, beat 3 is nearly as strong as beat 1** on every cue (3 to 9 % apart): a bar and its half are hard to tell apart from the notes alone, and the commonest miss is a 4/4 found as 2/4 (25 of the misses before the cues).
- **The bass moves on nearly every beat** (.94 to .99 of them), so it tells nothing, and isn't a cue.

What is built (`lineCues`): the new pitch classes in about a beat (four pulses) against the beat before, and the longest note, each counted where it stands above its own mean, weighed .5 against a pulse's mean accent (`CUES`), added to the bar line's weight; a bar's recurrence read on that line too.
Chosen over the four benches: it raises the MIDI library's bar from 35 to 40, its bar within a factor of two from 66 to 73, its start from 28 to 33 and its beats from 53 to 57; it holds the synthetic bench (bar 733, start 478 to 484) and the Groove fixtures, and costs the examples one beat count (45 to 44).
Read as the beat's grouping too (which beats a bar has), it cost the Groove fixtures their four beats, and isn't.
A heavier cue or a prior moved toward Bach's slower bars trades the benches against each other: a bar prior of 3.5 s raises Bach's bar to 48 and lowers the examples' to 40 and the synthetic's to 613.

What it doesn't read yet, the candidates for the next iteration: a cadence (a long bass note after a dominant, which lands on a bar's first beat), and the harmony at the bar's scale (a change every bar against every half bar), the cue that would tell 4/4 from 2/4.

## The next rungs (#648)

- A tempo curve: the grid refitted over a window that moves, for a performance that speeds up or a `free()` tempo moved.
- A bend: a level's nodes unequal and repeating, written `bend=` (decision 080).
- Its readers: `midiimport` writing the meter in place of a flat tempo scan (#44's size; the fold ratchet's jazz, five and coltrane, #660), Fold and Shorten's hints (#158), Cell studio's TimeView, Jambot's `estimateSwing`.
- Audio: an onset flux from `spectrogram.ts` as its onsets.
