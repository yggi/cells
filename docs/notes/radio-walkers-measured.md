# The radio's drift, measured: Jambot's walk against the radio as cells writes it

Date: 2026-11-23 · Status: measured; the choice is the owner's · Issues: [#571](https://github.com/yggi/cells/issues/571) step 4, [#576](https://github.com/yggi/cells/issues/576) rung 2, the half of yggi/jambot#617 that measures first, in the style epic [#536](https://github.com/yggi/cells/issues/536) · Frame: [571-style-at-every-scale.md](571-style-at-every-scale.md)

[#576's plan](https://github.com/yggi/cells/issues/576) for the radio (2026-11-08) was to measure the sample-and-hold sum against Jambot's walk on E30's columns before building the walkers, and then let the owner decide. This is that measurement. It builds nothing and decides no language: `npm run radio` (`tools/radio.ts`) reproduces every number here.

## What is compared

Every run is tuned in at one of Jambot's eight prototype presets and left alone for 3 hours of 8-bar sections of 4/4 at 104 bpm (585 sections), over 5 seeds a preset (40 runs a model), the style read at each section's start on the four axes `styles` has.

- **The walk**, Jambot's `radio.ts` (#313): every axis a step a section, uniform between minus and plus its step (sync .08, harm .1, bite .1, mood .06) scaled by the entropy, folded back at the ends, nothing pulling it home. At entropy 0.3 and 1.
- **The example's drift**, `examples/radio.md`: the preset's value on each axis moved inside a window by a sum of sample-and-holds at 8, 64 and 256 bars, weighted .5 .3 .2 (decision 079); the window's half-width 3.5 steps (.35 on bite, as the example writes it).
- **The same at six octaves**, 8 to 256 bars, weighted alike (the Voss and McCartney construction of #571's frame).

The cells models are texts, read through `styleAt` (#610) as a frontend reads a score's style, so the numbers are of what a piece plays. The columns are [E30's](https://github.com/yggi/jambot/blob/main/docs/language-experiments.md): the distance from where it was tuned in, the nearest preset, the sections an axis remembers itself for (`1 / (1 − ρ)`, A4), its bound.

| model | rms 10 min | rms 1 h | rms 3 h | first change (min) | changes/h | undone | at tuned in | presets | remembers (sections) | largest step; on an end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| the walk, entropy 0.3 | 0.05–0.11 | 0.09–0.27 | 0.14–0.34 | 46 (37 of 40) | 7.3 | 28 % | 50 % | 3.2 | 262.4–392.5 | 0.030; 0.0 % |
| the walk, entropy 1 | 0.14–0.32 | 0.22–0.48 | 0.36–0.41 | 5 (40 of 40) | 25.0 | 29 % | 20 % | 6.7 | 51.1–93.9 | 0.100; 0.0 % |
| the example (8, 64, 256 bars: .5 .3 .2) | 0.10–0.19 | 0.09–0.21 | 0.09–0.21 | 2 (40 of 40) | 38.8 | 43 % | 74 % | 4.3 | 5.0–8.6 | 0.613; 0.5 % |
| six octaves (8 to 256 bars, alike) | 0.07–0.12 | 0.03–0.12 | 0.05–0.15 | 8 (30 of 40) | 10.8 | 38 % | 91 % | 2.5 | 20.1–36.1 | 0.438; 0.0 % |

(Per axis, min–max over the four axes. "First change" is the median, in minutes, of the runs where the nearest preset changes at all, and how many do. "Presets" is how many of the eight are nearest some time.)

## The port is E30's

The nearest-preset columns can't equal E30's: this reads four axes where E30 read five and a tempo, at each section's start, with no glide. The rest lands where E30 does:

| | E30 | here |
|---|---|---|
| the walk at 0.3: distance after 10 min, 1 h | 0.07–0.10, 0.13–0.24 | 0.05–0.11, 0.09–0.27 |
| the nearest preset first changes, 0.3 / 1 | 43–76 min / 4–6 | 46 / 5 |
| changes an hour, 0.3 / 1 | 3.9–7.7 / 24–26 | 7.3 / 25.0 |
| an axis remembers itself, entropy 1 (sections) | 53–142 | 51–94 |
| largest step | the step the entropy allows | .030 at 0.3, .100 at 1 |

## What it says

1. **The example's drift is a jitter around a home, not a drift.** Its distance from where it was tuned in is 0.10–0.19 after 10 minutes and 0.09–0.21 after 3 hours: it does not grow. A sum of held draws is stationary, so the window's centre, the preset's point, is a home it never leaves (74 % of its time at the preset it was tuned in at, against the walk's 50 %).
2. **It is far jumpier than the walk at the same reach.** The largest step is 0.61 of an axis in one section (the walk at 0.3: 0.03); the nearest preset changes 38.8 times an hour (7.3), 43 % of the changes undone within a section; it remembers itself 5 to 9 sections, the walk's 262 to 393 at 0.3 (at entropy 1, 51 to 94). Its per-section jumps are the walkers' steps, held values that change at once.
3. **Six octaves tame it, and keep the home.** Its memory goes to 20–36 sections and its step to 0.44, but the station stays at its preset (91 % of its time, 2.5 presets visited): the more octaves, the closer to a slow bounded 1/f noise, and a bounded noise never goes anywhere.
4. **A sum of draws has no memory past its slowest walker (256 bars: 32 sections).** A random walk's position is the sum of *all* its past steps, so it is no function of the section it is in: it needs a form that carries state (a table of n sections written from a seed, a host that carries it as Jambot's `radio` machine does), or it is not a walk.

## For the owner

The walk is Jambot's by the owner's ruling on #313 ("no attraction"), and #571's frame asked for slow walkers pulled toward the library. They are two kinds of process, and this is the measure of it. The choices:

- **A. The walk stays the host's machine**, and the language gives the drift *within* it. The station's slow, homeless position is state a session carries (Jambot's `radio`); the language writes the offsets from it, as the chain of deltas does (`&bite [&base[bite] + &dsong + &dsect]`, #883, #896): a song's and a section's deltas bounded around the station's point, where a bounded noise is right. Nothing new in the language; the Radio example says what it is (a station tuned at a point with bounded motion around it).
- **B. The walk becomes a form of the language** (a seeded fill writing a reflected random walk as a table of n sections, decision 085's mechanism, as `metric_accent` is), so a score carries the station and yggi/jambot#617 can retire `radio.ts`. A decision of its own; a table is a finite lap (4,096 sections is 21 hours at these tempos).
- **C. The bounded noise, tuned**: more octaves, ramps between held values (`map=lin`, as the `lfo` module has) to take the jumps out, a window that follows the library's point. It stays a station with a home.

My reading: A with C's tuning for the part inside a song. The station's wandering is state, and a second implementation of the walk in the language would be the duplicate this epic exists to remove; what the language is good at is the offsets, and #883 and #896 just made them a chain. Not measured here: ramps (`map=lin`) between the walkers' holds, the walkers' weights (the spectrum of #571's table), and the music the band plays at a wandering style.

## Built: A with C's tuning (the `wander` module, 2026-11-24)

The owner chose A and C (2026-11-24: "carefully go ahead with A and C … whatever we do should point in the direction of generalization and abstraction, not special-casing"), and filed B as [#929](https://github.com/yggi/cells/issues/929), the walk as a generator. What was built is a module, not a radio:

- **`wander`** (`fragments/modules/09-wander.md`), beside `lfo` and `sh`: six noises an octave apart from its clock, each a value drawn afresh at its step and ramped (`map=lin`) to the next, summed (decision 079) with the slowest weighing most (1, 2, 4, 8, 16, 32 parts of 63). Any parameter can read it; nothing in it is the radio's. The Radio example's three hand-written walkers are now `&drift from wander`.
- **What tuning found** (the Radio's `bite`, window ±.35, 3 hours, bite read at each bar): *held* values jump by up to .54 a bar whatever their weights; *ramping* them alone left the jump at each lap's end, since a braid's last value holds and "starting again is a step" (`rampedSeries`), so a ramp needs a lap long enough that the seam is rare: 256 draws a lap, an hour or more at a section. Weights an octave doubled (a power falling as 1 / f², a random walk's, cut at the slowest octave) give the memory; equal weights, pink noise, give 3 sections.

| the bite of | largest change a bar | remembers (sections) | rms change over 10 min / 1 h | sd |
|---|---|---|---|---|
| the example's drift (8, 64, 256 bars held, .5 .3 .2) | .54 | 1.4 | .22 / .22 | .15 |
| six octaves held, alike | .41 | 3.0 | .15 / .15 | .10 |
| six octaves ramped, alike (256 draws a lap) | .18 | 3.6 | .12 / .13 | .09 |
| **`wander`: six octaves ramped, slow-weighted** | **.012** | **136** | .16 / .22 | .14 |

(One run of 3 hours each, the module's seeds written; the walk's largest change at entropy 0.3 is .03 a section, .004 a bar glided over 8 bars as Jambot does, and at entropy 1 .0125 a bar; it remembers itself 262–393 sections at 0.3.) The rms change does not grow: it is bounded, it has a home, the window's centre. That is A: the station's position is a host's, set by the sliders (`free(.55, 0..1)`), and this moves the style around it.

- **A gap this left, closed (#930, decision 105).** `wander` taken for four axes moved them together: its six seeds were written (1 to 6), and cells that write the same seed draw alike (decision 098 §4); `seed=&s` was refused, since a template could not pass a number read as the piece is built. A number so read may now be a cell, so `wander` takes a seed as a jack, `&seed` (0 by default, which draws what the module drew), its six noises' seeds derived from it (`&seed * 8 + 1` to `+ 6`): two copies draw apart (over 48 hours, 15 pairs of seeds, the correlation of two wanders is .016 on average, .068 at most) and the Radio is unchanged. The other, a ramp's last step holds and the next lap starts as a step, is why `wander` writes laps of 256 draws, [#931](https://github.com/yggi/cells/issues/931).

## Bounds

- `npm run radio -- [--hours 3] [--seeds 5] [--reach 3.5] [--json]`; the run takes seconds. `--reach` is the window's half-width in steps of the walk.
- The walk's draws are cells' own (`mulberry32`), not Jambot's `draw`, so its runs differ from E30's in the draws and agree in the statistics.
