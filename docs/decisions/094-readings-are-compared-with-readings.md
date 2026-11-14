# 094 · Readings are compared with readings: a reading of what plays is held to readings of placed fragments, never to a placement's scale

**Date:** 2026-11-13 · **Status:** accepted (the owner, 2026-11-13, on #681: "yes, as proposed") · Issues: #681, #723, yggi/jambot#346, yggi/jambot#640, yggi/jambot#673

*Read with [037](037-the-handshake-with-jambot.md) (the handshake with Jambot: its D6, a fragment's place is guessed only on the axes its notes carry) and [048](048-the-learned-layer.md) (the learned layer: where a fragment is placed).*

## Context

A style's point, and a fragment's place in style space, are placed by hand: the composer's intent ("this style syncopates a lot").
A reading (`readStyle`, `readPoint`) measures what a bar plays.
They are two scales, and until #681 the frontends held readings to placements.

- **#681 asked the `sync` reading to span the placements' range.** Jambot's presets are placed from 0.05 to 1.0, and the reading had to span 0.05 to 0.9 of that. It also had to make Jambot's critic (E24) at least as accurate with `sync` as without it, against two sets of landmarks: the presets' placed points, and where the presets' bars read.
- **No reading can meet the first.** Sweeping a Jambot style's `sync` from 0 to 1 moves the old reading (the share of onsets off the pulses and eighths) only 0.01 → 0.18, and #723's syncopation proper only 0.06 → 0.16. The fixed grid outnumbers what the axis moves.
- **Against the placed points, no reading meets the second either** (measured 2026-11-13 on Jambot `main` 8a4efa0; per bar, 8 presets × 5 seeds × 32 bars):

  | | no `sync` | old reading | syncopation proper |
  |---|---|---|---|
  | against the presets' placed points | 0.655 | 0.528 | 0.483 |
  | against where the presets read | 0.688 | 0.694 | 0.694 |

  Against the placed points, reading `sync` makes the critic worse, and the old reading did too: Funk lands 0.881 of the time without it and 0 with either reading. Its bars read low because the composer barely moves its drums with the axis (yggi/jambot#673), not because the reader fails.
- **On cells' own beats no statistic agreed with the hand placements** (old reading: Kendall's tau −0.19, #723). A beat is placed at its style's point, not by what it plays: `ride_shuffle` plays straight hits at `sync` 0.65, its shuffle being the meter's.
- **#723's first guess already compares readings with readings.** It guesses a fragment's place from the placements of the library fragments whose readings are nearest, and beats both the raw reading and the mean on beats' `sync` and harmonies' `harm`, by leave-one-out.

## Decision

1. **A reading is compared with readings.** Where a host, a tool or a test asks "where does this music sit", it compares its reading with readings of music whose place is known: the read landmarks of a frontend's critic, or the readings of placed fragments in `firstGuess`. A reading's distance to a hand-placed point is not a measure of the reader.
2. **A placement is the composer's, a reading the critic's.** Placements are not re-placed to agree with readings, and readings are not fitted onto placements (a calibration over the presets, which #681 itself ruled out). Each scale keeps its job: the composer places, the critic reads, and a first guess bridges them by comparing like with like.
3. **A comparison against placements is recorded, not bounded.** A frontend may keep it as a number in its experiments, with its reason, as Jambot's E24 keeps the placed-points figure. A bound on it would hold a reader to how far the composer's music expresses its axes, which is the composer's measure.
4. **How well the music expresses its axes is measured as the composer's.** A reading that spans little of an axis says the music varies little along it: a finding about what plays (yggi/jambot#673), not a fault of the reader.

## Consequences

- **#681's done-when is restated and met.** B's leave-one-out bounds hold (`firstguess.test.ts`). Jambot's E24 against where the presets read is at least as accurate with syncopation proper as with the old reading: per bar 0.694 = 0.694, per section 0.706 > 0.700. "Spans 0.05–0.9" and "against both landmark sets" are dropped.
- **yggi/jambot#640 takes cells' readers on these terms.** Jambot's E24 bounds move onto the read landmarks, and the placed-points figures are recorded with this decision as their reason. yggi/jambot#346 closes in favour of yggi/jambot#673.
- **Every reader cells adds or a frontend lifts is held to the same rule:** `harm`, `bite`, a mood reading, a reading in another meter once audition hosts one.
- **The rejected alternatives:**
  - re-placing the styles' `sync` from readings would move the presets' points, and with them what the band plays: a measurement problem turned into a change of sound;
  - fitting the reading onto the placements would hide the composer's compression rather than show it;
  - keeping the old statistic would keep a reading blind to a clave, a tresillo and an anticipation.
