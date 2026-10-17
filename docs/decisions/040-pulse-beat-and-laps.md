# 040 · A meter's pulse and beat, taps by note value, and `cycle=` in laps

**Date:** 2026-10-17 · **Status:** accepted (owner, in the session of 2026-10-16/17 on [#18](https://github.com/yggi/cells/issues/18) and [swing-research.md](../notes/swing-research.md)) · Issues: #15, #18

## Context

A line stepped by a meter wrote its step relative to the meter cell's own steps: `&bar*2` was "half a meter step", eighths under `scan(1 1 1 1)`, sixteenths under `meter("4/4", 2)`.
So changing the meter (4/4 to 3/4), or giving it swing as a tree of proportions (the note), changed what every line meant.
The owner asked for "a consistent, absolute and meter-invariant way of expressing 'the chords step on the bar', 'the lead steps on quarter notes' and 'drums step on sixteenths'", without rewriting a tap when the meter or its swing changes.
The same discussion settled what happens past the end of a lap, for pitch and for time alike.

## Decision

**A meter knows four things**, and `meter("n/d")` writes them all:

| | What it is | 3/4 | 4/4 | 6/8 | 9/8 | 7/8 (3+2+2) |
|---|---|---|---|---|---|---|
| **bar** | its lap | 3 quarters | 4 quarters | 6 eighths | 9 eighths | 7 eighths |
| **pulse** | the numerator: equal steps of the denominator's length; steady, not grouped | 3 | 4 | 6 | 9 | 7 |
| **beat** | what musicians count, what `bpm` counts, the feel | 3 | 4 | 2 | 3 | 3, unequal (3+2+2) |
| **the tree** | groups and their proportions (swing, aksak, agogic) | | | 3+3 | 3+3+3 | 3+2+2 |

- A `scan(…)` meter has as many pulses as entries, each a quarter (its denominator is 4), and its beats are its entries.
- `pulse=` states a scan's pulse value (`pulse=16n`: its entries sixteenths); its beats then count quarters (owner, 2026-10-17, on #79).
- `beat=` on a meter states another feel (`meter("4/4") beat=2`, alla breve).

**A line taps the meter by pulse, beat or note value**, never by the meter cell's own steps (a meter tap, not decision 016's section tap: [time.md](../language/time.md) names both):

- `step=pulse`, `step=pulse*k` (each pulse in k equal steps): in 7/8, `pulse` is 7 equal eighths, `pulse*2` 14 sixteenths.
- `step=beat`, `step=beat*k` (each beat in k equal steps): in 7/8, `beat` is a dotted quarter and two quarters, `beat*3` nine unequal steps, three eighths and two triplets.
- Note values, absolute: `16n`, `8n`, `4n`, `2n`, `1n`, `8t` (a triplet eighth), `4n.` (dotted), `1m` (the bar).
- They read the piece's main meter; another meter is named: `step=&bar2:16n`.
- The tree's proportions place the steps; a division the tree doesn't hold is even within its node (measured in the note: no example moves).
- **Swing never changes pulse or beat**, so it never changes what a tap means.
- A raw `step=&bar` (the meter cell's own steps) is discouraged: a warning, and Shorten migrates it to a tap (`src/engine/shorten/taps.ts`). Normalise, the corpus-wide command of [decision 017](017-shorten-and-normalise.md), is not built.

**`cycle=n` counts laps before it comes round:**

| `cycle=` | `[12]` | `[24]` | Meaning |
|---|---|---|---|
| absent | 12 | 24 | walk the helix for ever |
| `cycle=1` | 0 | 0 | wrap: one lap, the circle |
| `cycle=2` | 12 | 0 | two laps (an arpeggiator's two octaves) |
| `cycle=0` | 0 | 0 | constant: the first entry, whatever the index |

- A meter comes with `cycle=1`: its lap is the bar, so a tap comes round at every bar line. A note value longer than the room left in the bar is cut there: `1n` in 3/4 is one step a bar, a bar long; `4n.` in 4/4 is 3+3+2 eighths, the tresillo.
- `cycle=n` on a tap runs it n bars before it comes round: `step=1n cycle=4` in 3/4 is three whole notes over four bars.
- A pick or an `over=` walks (no `cycle=`); a turning table comes round when it is back where it started ([decision 008](008-tables-come-round.md), now counted in laps).
- This replaces `cycle=`'s count of steps ([decision 003](003-cycle-one-job.md), 008): a root's grid size moves to its map (`&edo19 map=edo(19)`), per tonos' `stride=2 cycle=24` becomes `cycle=2`, and a table's `cycle=` equal to its own length goes.

**Until v1.0.0 the language changes freely**, and the examples change with it (owner, 2026-10-17); a change still says so in the changelog, and Shorten writes the migration.

## Open

- `bpm` with unequal beats: the bar lasts `beats / bpm` minutes and its beats keep their proportions (7/8 at 90 bpm: a 2 s bar, 0.86 s and two 0.57 s beats). Confirm on the first rung.
- A kit's default `cycle=` (a drum index past the last drum): `cycle=1` proposed; today's behaviour unchecked.

## Consequences

- Rungs, each an issue under #15: the taps (pulse, beat, note values, the reset at the bar) with the examples moved to them; `cycle=` in laps with its migration; the proportions in the meter cell, written as a tree and as `swing=` keyed by note value (`swing=8n:.67`), with overrides at the tap (#18). Each measured against the event snapshots.
- `swing=` keyed by note value is built on the meter cell (#18's first rung, [time.md](../language/time.md)): `swing=8n:.67` leans one level, a group of three leaning its second and third, every node keeping its ends; levels nest, `swing=8n:.6,16n:.55` (what Jambot's swing axis needs). A bare `swing=.67` keeps its meaning on a list (pairs of its steps); on a meter it reads as the level of the meter cell's own steps, with a warning, and Shorten names the level (`src/engine/shorten/swing.ts`). The tree written in the meter cell and the overrides at the tap are not built.
- `beat=`'s old meaning (steps per beat) goes: `swing.cells` and `bwv847.cells` move to taps.
- Jambot's grid of sixteenths in every meter (T6) is this rule; its swing axis splits level from amount and later moves into the meter at the seam (yggi/jambot#309).
