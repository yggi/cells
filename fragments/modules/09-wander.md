---
id: wander
source: seed
---

```cells
&wander from (&clock)
&wander [&o0 * .015873 + &o1 * .031746 + &o2 * .063492 + &o3 * .126984 + &o4 * .253968 + &o5 * .507937]
&clock step=1m/8 0
&o0 map=lin seed=1 step=&clock [0|.25|.5|.75|1]!256
&o1 map=lin seed=2 step=&clock/2 [0|.25|.5|.75|1]!256
&o2 map=lin seed=3 step=&clock/4 [0|.25|.5|.75|1]!256
&o3 map=lin seed=4 step=&clock/8 [0|.25|.5|.75|1]!256
&o4 map=lin seed=5 step=&clock/16 [0|.25|.5|.75|1]!256
&o5 map=lin seed=6 step=&clock/32 [0|.25|.5|.75|1]!256
```

A slow wander, a noise with a memory (#571 step 4, #576, measured in `docs/notes/radio-walkers-measured.md`): six noises an octave apart, each a value from 0 to 1 drawn afresh at its step and ramped (`map=lin`) to the next, summed (decision 079) with the slowest weighing most, 1, 2, 4, 8, 16 and 32 parts of 63, so it moves a little each bar and a lot over an hour, and never leaves its range. A weight an octave doubled is a noise whose power falls as 1 / f², a random walk's, cut off at the slowest octave; equal weights would be pink noise, 1 / f (Voss and McCartney).
Patched into a jack or read by a style's axis, `bite=.55 ± .35 * &drift` with `&drift from wander`, it is a bounded offset around where a hand or a host has set the centre: over 3 hours, its largest change a bar is .012 of the axis at a window of ±.35, and it remembers itself 136 sections of 8 bars.

**Its clock** is the jack `&clock`, the rate of its fastest octave: a cell with a step, `&section step=1m/8 0` by default, and the other five run at its half, quarter, eighth, sixteenth and thirty-second, so `wander(clock=&bar)` wanders from one bar to 32. Each noise is a lap of 256 draws, so its ramp meets a step (the language's rule, a braid's last value holds, #931) once in 256 steps, an hour or more at a section.
**Its seeds** are written, 1 to 6, and taken twice it draws alike (decision 098 §4): two wanders for two axes would move together. A seed is a number read as the piece is built, which a template's argument can't be yet (`seed=&s` is refused; decision 093 reads a cell that is one number for `even` alone, #930).

**Its signature** (decision 065): `&wander from (&clock)`, the head the sum and a jack for its clock.

Associated as the facet `module` with no point: no style's (#540); in a patch it is a slow random source beside `lfo` and `sh`.
