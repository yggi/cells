---
id: wander
source: seed
---

```cells
&wander from (&clock, &seed)
&wander [&o0 * .015873 + &o1 * .031746 + &o2 * .063492 + &o3 * .126984 + &o4 * .253968 + &o5 * .507937]
&clock step=.05hz 0
&seed 0
&s0 [&seed * 8 + 1]
&s1 [&seed * 8 + 2]
&s2 [&seed * 8 + 3]
&s3 [&seed * 8 + 4]
&s4 [&seed * 8 + 5]
&s5 [&seed * 8 + 6]
&o0 map=lin seed=&s0 step=&clock [0|.25|.5|.75|1]!256
&o1 map=lin seed=&s1 step=&clock/2 [0|.25|.5|.75|1]!256
&o2 map=lin seed=&s2 step=&clock/4 [0|.25|.5|.75|1]!256
&o3 map=lin seed=&s3 step=&clock/8 [0|.25|.5|.75|1]!256
&o4 map=lin seed=&s4 step=&clock/16 [0|.25|.5|.75|1]!256
&o5 map=lin seed=&s5 step=&clock/32 [0|.25|.5|.75|1]!256
```

A slow wander, a noise with a memory (#571 step 4, #576, measured in `docs/notes/radio-walkers-measured.md`): six noises an octave apart, each a value from 0 to 1 drawn afresh at its step and ramped (`map=lin`) to the next, summed (decision 079) with the slowest weighing most, 1, 2, 4, 8, 16 and 32 parts of 63, so it moves a little each bar and a lot over an hour, and never leaves its range. A weight an octave doubled is a noise whose power falls as 1 / f², a random walk's, cut off at the slowest octave; equal weights would be pink noise, 1 / f (Voss and McCartney).
Patched into a jack or read by a style's axis, `bite=.55 ± .35 * &drift` with `&drift from wander(clock=&section)`, it is a bounded offset around where a hand or a host has set the centre: over 3 hours, its largest change a bar is .012 of the axis at a window of ±.35 on a section's clock, and it remembers itself 136 sections of 8 bars.

**Its clock** is the jack `&clock`, the rate of its fastest octave: a cell with a step, a draw every 20 seconds (`.05hz`) by default, and the other five run at its half, quarter, eighth, sixteenth and thirty-second, so the slowest turns every ten minutes. A piece ties it to its bars with a clock of its own, `&section step=1m/8 0` and `wander(clock=&section)`: a draw a section of eight bars, the slowest every 256 bars. Each noise is a lap of 256 draws, so its ramp meets a step (the language's rule, a braid's last value holds, #931) once in 256 steps, an hour or more at a section.
**Its seed** is the jack `&seed`, a number (0 by default), and the six noises' seeds are derived from it, `&seed * 8 + 1` to `&seed * 8 + 6` (decision 105: a number read as the piece is built may be a cell, and a sum of numbers alone is one), so two wanders with seeds 0 and 1 share none and draw apart: `&dx from wander(seed=&sx)` and `&dy from wander(seed=&sy)` for two axes that must not move together. A copy given no seed is the module's own, 0, which draws what the module drew before it took one (decision 098 §4: cells that write the same seed draw alike).

**Its signature** (decision 065): `&wander from (&clock, &seed)`, the head the sum and a jack each for its clock and its seed.

Associated as the facet `module` with no point: no style's (#540); in a patch it is a slow random source beside `lfo` and `sh`.
