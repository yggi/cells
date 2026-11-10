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
The measures, each of a case found:

- **bar**, **start**: the bar's length, and its line within half a beat of the written one; **level**: the bar found or one of its metrical variants (below) is the written one, length and line; **beats**, **groups**: how many beats a bar, and its groups in eighths; **beat**: the beat's length; **swing**: the eighths' share within .03.

On 2026-11-09:

| bench | level | bar | start | beats | groups | beat | swing |
|---|---|---|---|---|---|---|---|
| examples (55) | 46 | 44 | 42 | 46 | 41 | 46 | 52 |
| synthetic (1035) | 962 | 840 | 835 | 485 | 331 | 464 | 813 |
| groove (3) | 2 | 3 | 2 | 3 | 3 | 3 | 3 |
| bach (88) | 68 | 44 | 37 | 62 | 34 | 40 | 88 |

The synthetic bench once weighed a note by its level against .5, clipped at 1, so a kick at .6 weighed as much as the bar line's at 1, and a snare and a kick on beat 4 outweighed the bar line: its 4/4 was found as 3/4, its 12/8 as 9/8. A note now weighs its level against the piece's loudest; the bench's numbers before 2026-11-09's last commit were measured with the clip.

## Against #648's bounds

The bounds are read on **level** (the owner on #667, 2026-11-09): a bar found double or half, its lines on the written ones, is the same meter at another level, and counts.
For this first rung they are what is measured, held by the ratchet (the owner, 2026-11-10): the cues the notes give at their own scale move the MIDI library by about two files of 88, each gain a loss elsewhere, and more weights tuned on the benches they are measured on would fit them, not find meters.

- **The Groove fixtures' swing within .03:** 3 of 3, met. Their tempo, bar, beats and grouping too; the bar's start on 2 of 3.
- **The examples:** level at least 84 % (46 of 55), swing at least 95 % (52).
- **The MIDI library:** level at least 77 % (68 of 88).
- **The synthetic bench:** level at least 93 % (962 of 1035).

#648's first bounds, 90 % of the examples and 80 % of the MIDI library, are the next rung's ([#680](https://github.com/yggi/cells/issues/680)): a cadence read in the key, and its weights tuned on half the library and measured on the other half.

## What it can't know, and how it says so

- **A strictly repeating bar is one bar or two.** A pattern that repeats each two beats sounds the same written 2/4 or 4/4; it differs in which strokes are bar lines (a level's grade, a `1m` tap, a section's count of bars), which the notes tell only weakly: in Bach's 4/4, beat 3 is within 3 to 9 % of beat 1 on every cue (below). So `findMeter` chooses one, under a prior on a bar's length (2.4 s, `BAR_PRIOR`), and gives the others as its **variants** (`Found.variants`): half the bar, and two of it starting at either of its lines, each with its likeness, its score as a share of the chosen one's. A reader that knows more, a phrase's length in the importer, a level shown in the TimeView, chooses among them. Beat tracking counts these the same way (AMLt, Davies et al. 2009).
  The one exception is a rule, not the prior: a bar whose halves are the same and whose half groups its beats in twos and threes is two bars of aksak (a doubled bar can't spell 2+3+3).
- **A tempo is one or its double.** `prelude` at 66 bpm is found at 132, its bar half the written one: a variant, and counted so.
- **A swing near 2/3 is a triplet grid.** `electroswing`'s .64 is found as 12/8: its swung eighths sit within the written grid's 12 ms of the triplets.

**What is still wrong**, beyond the variants (on 2026-11-09, before the bench's weights were mended): in the MIDI library, three beats found as four or four as three (12), and a bar right but its line off (7, mostly on beat 3); in the examples, three against four (5) and a line off (4).
The prior on a bar's length was narrower (1 octave) while a variant counted as wrong; now that a variant counts, it is wider (1.5), so that it no longer chooses 4/4 over a minuet's 3/4 by its length alone. And a bar's recurrence is its line's correlation with itself a bar later (1 for a bar repeated exactly), where a product's mean was held up by every pulse alike.

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
Chosen over the four benches (with the narrower prior): it raised the MIDI library's bar from 35 to 40, its bar within a factor of two from 66 to 73, its start from 28 to 33 and its beats from 53 to 57, held the Groove fixtures, and cost the examples one beat count (45 to 44).
Read as the beat's grouping too (which beats a bar has), it cost the Groove fixtures their four beats, and isn't.
A heavier cue or a prior moved toward Bach's slower bars trades the benches against each other: a bar prior of 3.5 s raises Bach's bar to 48 and lowers the examples' to 40 and the synthetic's to 613.

Tried and not kept (#667, 2026-11-10): a falling fifth in the bass, more where held, as a cadence (the MIDI library's level 68 to 70 at a weight of .15, its bar down one; at .5 and 1, 68 and 64); the bass note's length (69 at most, the examples down 2 to 6).
What it doesn't read yet, the next rung's ([#680](https://github.com/yggi/cells/issues/680)): a cadence in the key (V to I, not any falling fifth), and the harmony at the bar's scale (a change every bar against every half bar), the cue that would tell 4/4 from 2/4.

## The next rungs (#648)

- A tempo curve: the grid refitted over a window that moves, for a performance that speeds up or a `free()` tempo moved.
- A bend: a level's nodes unequal and repeating, written `bend=` (decision 080).
- Its readers: `midiimport` writing the meter in place of a flat tempo scan (#44's size; the fold ratchet's jazz, five and coltrane, #660), Fold and Shorten's hints (#158), Cell studio's TimeView, Jambot's `estimateSwing`.
- Audio: an onset flux from `spectrogram.ts` as its onsets.
