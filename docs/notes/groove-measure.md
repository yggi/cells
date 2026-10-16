# Swing, agogic and accent in the Groove MIDI Dataset

Date: 2026-10-16 · Status: measured · Issue: [#19](https://github.com/yggi/cells/issues/19), for the meter epic [#15](https://github.com/yggi/cells/issues/15) (rulings 4–6, issues #18, #20, #21) and [yggi/jambot#144](https://github.com/yggi/jambot/issues/144) (ternary or uneven swing) · Tool: `tools/groove.ts`

What drummers play, measured: how far the second of a pair of 8ths or 16ths leans (swing), how long each beat of a 4/4 bar is (agogic), and how hard each metric level is struck (accent). A measurement; it decides no language. The numbers below are the tool's output as it printed it.

## Reproduce

The tables came from `tools/groove.ts` at commit 28c78e7, over the MIDI-only release of the [Groove MIDI Dataset](https://magenta.tensorflow.org/datasets/groove) (Magenta, CC-BY 4.0; `groove-v1.0.0-midionly.zip`, sha256 `651cbc52…4841dcc1e`, not committed):

```sh
curl -O https://storage.googleapis.com/magentadata/datasets/groove/groove-v1.0.0-midionly.zip && unzip groove-v1.0.0-midionly.zip
node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/groove.ts groove --list sample.txt
```

`--list` writes the sample's file names: they are committed as [groove-measure.files.txt](groove-measure.files.txt). The run takes under 2 s. `tools/groove.test.ts` runs the same code over three of the dataset's files (`fixtures/groove/`, with their licence) and over synthetic performances.

## The sample

**231 performances, 18 styles, 9 drummers**, about 10.9 hours by `info.csv`'s durations: every file in the dataset's `info.csv` marked 4-4 with at least 60 s between its first onset and its last (233 are 4-4 and at least 60 s long by `info.csv`; two of them play for less than 60 s). The style is the first part of the dataset's label (`funk/groove1` is funk). Every one is a `beat` (none of the fills lasts a minute). Seven styles have at least 12 performances: rock 65, latin 40, funk 33, jazz 22, afrobeat 13, hiphop 12, neworleans 12.

Two facts about the dataset bound what it can say:
- **Every performance was played to a click.** The dataset's page: "Each performance was played along with a metronome set at a specific tempo by the drummer." Its MIDI carries that tempo (480 ticks a quarter), and tick 0 is a downbeat: counted once over the sample with a scratch script, most kicks near a beat fall on beats 1 and 3 and most snares on 2 and 4 when the bars are counted from it.
- **Two drummers play most of it**: drummer8 69 performances, drummer1 61, drummer5 38, drummer7 37, the other five 26 between them. A style's number is partly its drummers' habit.

## How it is measured

- **The grid** is the tempo map's: beat k is quarter note k from the file's start, each bar four beats from beat 0. A slot (a beat, an 8th, a 16th) takes the onset nearest it, of any drum, within a window; the measures are taken between the onsets themselves, so a drummer ahead of or behind the click moves nothing.
- **Swing per level**: a pair of 8ths spans a beat, a pair of 16ths half a beat. For each pair, the onsets nearest its first slot, its second and the next pair's first, each within **±25 % of the pair**; the share is the second onset's place between the first and the next: (b − a) / (c − a), 0.5 straight, 0.667 for 2:1, what `swing=` writes. The window is a quarter of the pair, not of the slot, because a quarter of the slot (±0.125 of a beat for 8ths) would leave out 2:1 swing itself (0.667 is 0.167 of a beat from the straight slot); with it, shares from 0.25 to 0.75 (3:1) are read. A pair with a slot empty is not measured.
- **Swing per performance**: a performance's own median share at a level, over at least 20 of its pairs; it **swings** the level when that median is **0.55 or more** (chosen between 0.5 and 0.6: at 8ths the per-performance medians separate there, nearly all straight ones at 0.47–0.53 in a scratch histogram and the swung ones from 0.588 up; at 16ths they run on from 0.47 to 0.6 with no gap, so the 16th count leans on the threshold).
- **Agogic**: for each bar, the onsets nearest its four beats and the next downbeat, each within ±25 % of a beat; each beat's length as a share of the bar. A performance **leans** a beat when its own median share of it, over at least 20 bars, is 0.01 or more from 0.25 (`scan(26 24 25 25)` is a lean of 0.01).
- **Velocity by level**: each onset is counted at its nearest 16th in the bar: the downbeat, beat 3, beats 2 and 4, the 8th off-beats, the 16th off-beats (cells' `meter("4/4", 4)` writes them `*`, `+`, `+`, `.`, `,`: no signature writes beat 3 apart, which is why it has a column of its own). Every onset counts in the first table; the second keeps the hi-hat and the ride struck with a stick (the TD-11's keys 42 22 46 26 and 51 59 53; the pedal, 44, is left out), an accent within one voice rather than which drum falls where. The dB row converts the medians through velocity = 127·√level: 40·log₁₀(v / v_downbeat).
- **Too few**: a median is printed only over at least 100 values from at least 3 performances; otherwise the cell says _too few (values from performances)_.

## What it says

- **Swing is a performance's, not a style's.** Pooled by style, every 8th median is between 0.488 and 0.504 but jazz's (0.542, IQR 0.496–0.634): most pairs in every style are straight. Per performance, 27 of 231 swing their 8ths and 48 of 226 their 16ths, in rock (8 of 65 at 8ths, three of them labelled shuffle), jazz (10 of 22), latin, funk, reggae, punk and afrocuban; neworleans (8 of 12), hiphop (6 of 12) and soul (3 of 5) swing 16ths and never 8ths.
- **Swing is uneven, mostly short of 2:1.** The 8th-swinging performances' medians: median 0.638, from 0.588 to 0.713; three of 27 reach 0.667 or more. At 16ths: median 0.594, from 0.550 to 0.771. For yggi/jambot#144: what is played is a lean between straight and ternary, lighter at 16ths than at 8ths, not the ternary 0.667.
- **No agogic, to a click.** Every style's median beat is 0.247–0.252 of its bar, `scan(25 25 25 25)`, with an IQR of about ±0.005 over the bars (±0.007 in jazz); one performance of 228 leans a beat by 0.01 or more, a prog rock piece at 190 bpm that plays long-short-long-short (0.284 0.206 0.297 0.210). The data can't say what a drummer does without a click: it was all played to one.
- **Accent: the backbeat and the 16ths.** Over every onset, beats 2 and 4 are the loudest (+3.3 dB from the downbeat, where the snare's backbeat falls), beat 3 and the 8th off-beats about the downbeat's (−0.5 dB), the 16th off-beats −5.4 dB. On the hi-hat and ride alone: beats 2, 4 +1.9 dB, beat 3 −1.6 dB, 8th off-beats −2.6 dB, 16th off-beats −7.3 dB: beat 3 is softer than beat 1 on the cymbals, and the off-beats fall away level by level.

## What it can't say

- Styles with one or two performances (country, highlife, pop, blues, gospel, middleeastern) have no medians: _too few_ in every table.
- A 16th that is really a swung 8th: at 0.667 of the beat it lies outside the window of the 16th pair's middle slot (0.375–0.625), so it is not read as a 16th; but where a performance swings 8ths, its 16th pairs are the few it has, and at fast tempi the levels blur (jazz-fast at 290 bpm reads 0.528 at 8ths and 0.722 at 16ths).
- A swung 8th is counted at the 16th off-beat it is nearest when its velocity is levelled (0.667 is nearer 0.75 than 0.5): the velocity tables count a swinging performance's off-beat 8ths among the 16ths.
- Pairs are pooled: a long or dense performance weighs more in a style's pooled median than a short one; the per-performance table is the other view.

## The tables

### Swing: the second onset’s share of the pair, every pair pooled

| style | perf. | 8ths median | 8ths IQR | 8ths pairs (perf.) | 16ths median | 16ths IQR | 16ths pairs (perf.) |
|---|--:|--:|--:|--:|--:|--:|--:|
| rock | 65 | 0.499 | 0.482–0.522 | 19048 (65) | 0.508 | 0.477–0.546 | 17095 (65) |
| latin | 40 | 0.495 | 0.478–0.510 | 13305 (40) | 0.490 | 0.449–0.534 | 19302 (40) |
| funk | 33 | 0.498 | 0.486–0.509 | 8118 (33) | 0.518 | 0.488–0.569 | 11058 (33) |
| jazz | 22 | 0.542 | 0.496–0.634 | 5974 (22) | 0.514 | 0.466–0.579 | 4414 (22) |
| afrobeat | 13 | 0.498 | 0.489–0.508 | 3901 (13) | 0.511 | 0.486–0.543 | 4850 (13) |
| hiphop | 12 | 0.500 | 0.491–0.508 | 2214 (12) | 0.512 | 0.483–0.598 | 2338 (12) |
| neworleans | 12 | 0.499 | 0.486–0.511 | 2818 (12) | 0.564 | 0.527–0.595 | 4498 (12) |
| afrocuban | 7 | 0.493 | 0.472–0.584 | 3042 (7) | 0.478 | 0.444–0.513 | 3754 (7) |
| soul | 6 | 0.488 | 0.475–0.502 | 992 (6) | 0.574 | 0.528–0.627 | 730 (6) |
| dance | 5 | 0.489 | 0.475–0.503 | 1864 (5) | 0.513 | 0.483–0.543 | 2870 (5) |
| reggae | 4 | 0.504 | 0.480–0.636 | 1075 (4) | 0.500 | 0.453–0.556 | 761 (4) |
| punk | 3 | 0.504 | 0.487–0.621 | 863 (3) | 0.543 | 0.486–0.597 | 625 (3) |
| country | 2 | too few (461 from 2) |  | 461 (2) | too few (601 from 2) |  | 601 (2) |
| highlife | 2 | too few (572 from 2) |  | 572 (2) | too few (1014 from 2) |  | 1014 (2) |
| pop | 2 | too few (324 from 2) |  | 324 (2) | too few (109 from 2) |  | 109 (2) |
| blues | 1 | too few (319 from 1) |  | 319 (1) | too few (340 from 1) |  | 340 (1) |
| gospel | 1 | too few (273 from 1) |  | 273 (1) | too few (278 from 1) |  | 278 (1) |
| middleeastern | 1 | too few (461 from 1) |  | 461 (1) | too few (456 from 1) |  | 456 (1) |
| all | 231 | 0.498 | 0.483–0.517 | 65624 (231) | 0.508 | 0.472–0.555 | 75093 (231) |

### Swing per performance: how many swing (own median ≥ 0.55), and by how much

| style | 8ths swung / measured | their medians: median (range) | 16ths swung / measured | their medians: median (range) |
|---|--:|--:|--:|--:|
| rock | 8 / 65 | 0.635 (0.590–0.705) | 11 / 64 | 0.593 (0.550–0.771) |
| latin | 4 / 40 | 0.638 (0.632–0.641) | 1 / 40 | 0.653 (0.653–0.653) |
| funk | 1 / 33 | 0.625 (0.625–0.625) | 9 / 33 | 0.601 (0.564–0.629) |
| jazz | 10 / 22 | 0.646 (0.588–0.713) | 7 / 20 | 0.592 (0.555–0.722) |
| afrobeat | 0 / 13 | — | 0 / 13 | — |
| hiphop | 0 / 12 | — | 6 / 12 | 0.616 (0.597–0.686) |
| neworleans | 0 / 12 | — | 8 / 12 | 0.578 (0.555–0.590) |
| afrocuban | 2 / 7 | 0.632 (0.628–0.636) | 0 / 7 | — |
| soul | 0 / 6 | — | 3 / 5 | 0.601 (0.579–0.604) |
| dance | 0 / 5 | — | 0 / 5 | — |
| reggae | 1 / 4 | 0.642 (0.642–0.642) | 1 / 4 | 0.585 (0.585–0.585) |
| punk | 1 / 3 | 0.658 (0.658–0.658) | 1 / 3 | 0.567 (0.567–0.567) |
| country | 0 / 2 | — | 0 / 2 | — |
| highlife | 0 / 2 | — | 0 / 2 | — |
| pop | 0 / 2 | — | 0 / 1 | — |
| blues | 0 / 1 | — | 0 / 1 | — |
| gospel | 0 / 1 | — | 1 / 1 | 0.601 (0.601–0.601) |
| middleeastern | 0 / 1 | — | 0 / 1 | — |
| all | 27 / 231 | 0.638 (0.588–0.713) | 48 / 226 | 0.594 (0.550–0.771) |

### The performances that swing a level (own median ≥ 0.55)

| file | style | bpm | 8ths | 16ths |
|---|---|--:|--:|--:|
| drummer1/session1/184_reggae_78_beat_4-4.mid | reggae | 78 | 0.489 | 0.585 |
| drummer1/session1/202_rock-halftime_140_beat_4-4.mid | rock | 140 | 0.498 | 0.550 |
| drummer1/session1/239_funk-purdieshuffle_130_beat_4-4.mid | funk | 130 | 0.625 | 0.469 |
| drummer1/session1/47_jazz_102_beat_4-4.mid | jazz | 102 | 0.642 | 0.498 |
| drummer1/session1/48_jazz_93_beat_4-4.mid | jazz | 93 | 0.657 | 0.498 |
| drummer1/session1/49_jazz_125_beat_4-4.mid | jazz | 125 | 0.659 | 0.512 |
| drummer1/session1/50_jazz_125_beat_4-4.mid | jazz | 125 | 0.713 | — |
| drummer1/session1/51_rock-shuffle_125_beat_4-4.mid | rock | 125 | 0.705 | 0.479 |
| drummer1/session1/52_jazz_125_beat_4-4.mid | jazz | 125 | 0.521 | 0.569 |
| drummer1/session1/77_jazz-mediumfast_180_beat_4-4.mid | jazz | 180 | 0.642 | 0.509 |
| drummer1/session1/78_jazz-fast_290_beat_4-4.mid | jazz | 290 | 0.528 | 0.722 |
| drummer1/session1/82_neworleans-funk_84_beat_4-4.mid | neworleans | 84 | 0.498 | 0.560 |
| drummer1/session2/110_rock-prog_190_beat_4-4.mid | rock | 190 | 0.499 | 0.577 |
| drummer1/session2/112_afrocuban-bembe_122_beat_4-4.mid | afrocuban | 122 | 0.636 | 0.491 |
| drummer1/session2/142_gospel_120_beat_4-4.mid | gospel | 120 | 0.493 | 0.601 |
| drummer1/session2/180_rock_50_beat_4-4.mid | rock | 50 | 0.505 | 0.595 |
| drummer1/session2/181_rock_115_beat_4-4.mid | rock | 115 | 0.637 | 0.504 |
| drummer1/session2/2_latin-chacarera_118_beat_4-4.mid | latin | 118 | 0.641 | 0.489 |
| drummer1/session2/32_punk_140_beat_4-4.mid | punk | 140 | 0.494 | 0.567 |
| drummer1/session2/3_latin-chacarera_118_beat_4-4.mid | latin | 118 | 0.638 | 0.495 |
| drummer1/session2/62_punk_144_beat_4-4.mid | punk | 144 | 0.658 | 0.494 |
| drummer1/session3/2_jazz-swing_185_beat_4-4.mid | jazz | 185 | 0.588 | 0.700 |
| drummer1/session3/3_rock-rockabilly_200_beat_4-4.mid | rock | 200 | 0.590 | 0.703 |
| drummer1/session3/4_jazz-linear_182_beat_4-4.mid | jazz | 182 | 0.608 | 0.479 |
| drummer10/session1/10_jazz-swing_110_beat_4-4.mid | jazz | 110 | 0.501 | 0.588 |
| drummer10/session1/1_jazz-swing_124_beat_4-4.mid | jazz | 124 | 0.643 | 0.521 |
| drummer10/session1/2_jazz-swing_215_beat_4-4.mid | jazz | 215 | 0.650 | 0.555 |
| drummer10/session1/9_jazz-swing_110_beat_4-4.mid | jazz | 110 | 0.516 | 0.592 |
| drummer3/session1/8_jazz_105_beat_4-4.mid | jazz | 105 | 0.498 | 0.609 |
| drummer5/session1/18_afrocuban_128_beat_4-4.mid | afrocuban | 128 | 0.628 | 0.502 |
| drummer5/session2/10_neworleans-funk_102_beat_4-4.mid | neworleans | 102 | 0.499 | 0.583 |
| drummer5/session2/14_rock_140_beat_4-4.mid | rock | 140 | 0.638 | 0.502 |
| drummer5/session2/15_latin-venezuelan-joropo_80_beat_4-4.mid | latin | 80 | 0.487 | 0.653 |
| drummer5/session2/4_reggae_141_beat_4-4.mid | reggae | 141 | 0.642 | 0.466 |
| drummer5/session2/9_neworleans-shuffle_104_beat_4-4.mid | neworleans | 104 | 0.491 | 0.555 |
| drummer6/session2/1_rock_95_beat_4-4.mid | rock | 95 | 0.495 | 0.593 |
| drummer6/session2/2_rock_95_beat_4-4.mid | rock | 95 | 0.495 | 0.643 |
| drummer6/session3/4_rock_127_beat_4-4.mid | rock | 127 | 0.501 | 0.565 |
| drummer6/session3/5_rock_180_beat_4-4.mid | rock | 180 | 0.496 | 0.619 |
| drummer7/session1/15_jazz_112_beat_4-4.mid | jazz | 112 | 0.701 | — |
| drummer7/session2/123_hiphop_140_beat_4-4.mid | hiphop | 140 | 0.484 | 0.686 |
| drummer7/session2/64_rock_145_beat_4-4.mid | rock | 145 | 0.481 | 0.771 |
| drummer7/session2/72_funk_100_beat_4-4.mid | funk | 100 | 0.489 | 0.567 |
| drummer7/session3/132_soul_105_beat_4-4.mid | soul | 105 | 0.486 | 0.604 |
| drummer7/session3/133_soul_105_beat_4-4.mid | soul | 105 | 0.484 | 0.601 |
| drummer7/session3/151_soul_98_beat_4-4.mid | soul | 98 | 0.495 | 0.579 |
| drummer7/session3/67_neworleans-funk_93_beat_4-4.mid | neworleans | 93 | 0.502 | 0.574 |
| drummer8/session1/10_neworleans-funk_82_beat_4-4.mid | neworleans | 82 | 0.495 | 0.576 |
| drummer8/session1/11_neworleans-funk_82_beat_4-4.mid | neworleans | 82 | 0.500 | 0.580 |
| drummer8/session1/12_latin_118_beat_4-4.mid | latin | 118 | 0.632 | 0.485 |
| drummer8/session1/13_latin_118_beat_4-4.mid | latin | 118 | 0.638 | 0.504 |
| drummer8/session1/14_hiphop_94_beat_4-4.mid | hiphop | 94 | 0.496 | 0.597 |
| drummer8/session1/15_hiphop_94_beat_4-4.mid | hiphop | 94 | 0.494 | 0.602 |
| drummer8/session1/18_funk_108_beat_4-4.mid | funk | 108 | 0.499 | 0.564 |
| drummer8/session1/19_funk_108_beat_4-4.mid | funk | 108 | 0.504 | 0.586 |
| drummer8/session1/20_rock-shuffle_112_beat_4-4.mid | rock | 112 | 0.632 | 0.501 |
| drummer8/session1/21_rock-shuffle_112_beat_4-4.mid | rock | 112 | 0.630 | 0.508 |
| drummer8/session1/23_hiphop_70_beat_4-4.mid | hiphop | 70 | 0.506 | 0.651 |
| drummer8/session1/28_rock_102_beat_4-4.mid | rock | 102 | 0.499 | 0.553 |
| drummer8/session1/8_funk_96_beat_4-4.mid | funk | 96 | 0.496 | 0.625 |
| drummer8/session1/9_funk_96_beat_4-4.mid | funk | 96 | 0.499 | 0.610 |
| drummer8/session2/10_hiphop_86_beat_4-4.mid | hiphop | 86 | 0.502 | 0.603 |
| drummer8/session2/15_funk_95_beat_4-4.mid | funk | 95 | 0.465 | 0.624 |
| drummer8/session2/16_funk_95_beat_4-4.mid | funk | 95 | 0.476 | 0.629 |
| drummer8/session2/19_neworleans-funk_90_beat_4-4.mid | neworleans | 90 | 0.499 | 0.581 |
| drummer8/session2/1_funk_92_beat_4-4.mid | funk | 92 | 0.499 | 0.597 |
| drummer8/session2/20_neworleans-funk_90_beat_4-4.mid | neworleans | 90 | 0.497 | 0.590 |
| drummer8/session2/22_rock_96_beat_4-4.mid | rock | 96 | 0.628 | 0.505 |
| drummer8/session2/2_funk_92_beat_4-4.mid | funk | 92 | 0.495 | 0.601 |
| drummer8/session2/9_hiphop_86_beat_4-4.mid | hiphop | 86 | 0.503 | 0.629 |
| drummer9/session1/20_rock_120_beat_4-4.mid | rock | 120 | 0.664 | 0.528 |
| drummer9/session1/24_rock_90_beat_4-4.mid | rock | 90 | 0.498 | 0.565 |

### Agogic: each beat’s share of the bar, median (IQR) over the bars

| style | perf. | bars (perf.) | beat 1 | beat 2 | beat 3 | beat 4 | as a scan | perf. leaning ≥ 0.01 |
|---|--:|--:|--:|--:|--:|--:|---|--:|
| rock | 65 | 4859 (65) | 0.250 (0.246–0.255) | 0.250 (0.246–0.254) | 0.250 (0.245–0.254) | 0.250 (0.246–0.254) | `scan(25 25 25 25)` | 1 / 63 |
| latin | 40 | 3300 (40) | 0.250 (0.245–0.254) | 0.250 (0.246–0.254) | 0.249 (0.245–0.254) | 0.251 (0.246–0.256) | `scan(25 25 25 25)` | 0 / 40 |
| funk | 33 | 2100 (33) | 0.251 (0.247–0.254) | 0.249 (0.245–0.252) | 0.251 (0.247–0.254) | 0.250 (0.247–0.253) | `scan(25 25 25 25)` | 0 / 33 |
| jazz | 22 | 1643 (22) | 0.251 (0.246–0.257) | 0.250 (0.243–0.255) | 0.249 (0.243–0.256) | 0.250 (0.244–0.256) | `scan(25 25 25 25)` | 0 / 21 |
| afrobeat | 13 | 974 (13) | 0.250 (0.247–0.253) | 0.249 (0.245–0.253) | 0.251 (0.248–0.255) | 0.251 (0.248–0.253) | `scan(25 25 25 25)` | 0 / 13 |
| hiphop | 12 | 533 (12) | 0.251 (0.248–0.254) | 0.249 (0.246–0.252) | 0.249 (0.246–0.253) | 0.250 (0.247–0.253) | `scan(25 25 25 25)` | 0 / 12 |
| neworleans | 12 | 702 (12) | 0.250 (0.245–0.253) | 0.250 (0.247–0.254) | 0.249 (0.245–0.253) | 0.251 (0.247–0.254) | `scan(25 25 25 25)` | 0 / 12 |
| afrocuban | 7 | 749 (7) | 0.249 (0.245–0.254) | 0.251 (0.246–0.256) | 0.249 (0.245–0.254) | 0.250 (0.246–0.255) | `scan(25 25 25 25)` | 0 / 7 |
| soul | 6 | 257 (6) | 0.252 (0.247–0.256) | 0.248 (0.245–0.253) | 0.250 (0.246–0.254) | 0.249 (0.246–0.254) | `scan(25 25 25 25)` | 0 / 6 |
| dance | 5 | 475 (5) | 0.251 (0.248–0.255) | 0.249 (0.246–0.253) | 0.248 (0.244–0.252) | 0.251 (0.247–0.256) | `scan(25 25 25 25)` | 0 / 5 |
| reggae | 4 | 257 (4) | 0.251 (0.246–0.255) | 0.251 (0.247–0.256) | 0.249 (0.244–0.255) | 0.249 (0.244–0.253) | `scan(25 25 25 25)` | 0 / 4 |
| punk | 3 | 265 (3) | 0.251 (0.246–0.255) | 0.251 (0.246–0.256) | 0.247 (0.243–0.251) | 0.251 (0.246–0.256) | `scan(25 25 25 25)` | 0 / 3 |
| country | 2 | 114 (2) | too few (114 from 2) | | | | | |
| highlife | 2 | 143 (2) | too few (143 from 2) | | | | | |
| pop | 2 | 93 (2) | too few (93 from 2) | | | | | |
| blues | 1 | 79 (1) | too few (79 from 1) | | | | | |
| gospel | 1 | 68 (1) | too few (68 from 1) | | | | | |
| middleeastern | 1 | 113 (1) | too few (113 from 1) | | | | | |
| all | 231 | 16724 (231) | 0.250 (0.246–0.254) | 0.250 (0.245–0.254) | 0.250 (0.245–0.254) | 0.250 (0.246–0.254) | `scan(25 25 25 25)` | 1 / 228 |

The performances that lean a beat by 0.01 or more, their own medians:

- drummer1/session2/110_rock-prog_190_beat_4-4.mid (rock, 190 bpm, 74 bars): 0.284 0.206 0.297 0.210

### Velocity by metric level: median (onsets), every onset

| style | downbeat (*) | beat 3 (+) | beats 2, 4 (+) | 8th off-beats (.) | 16th off-beats (,) |
|---|--:|--:|--:|--:|--:|
| rock | 73 (11363) | 73 (9072) | 94 (21897) | 67 (27456) | 53 (27104) |
| latin | 54 (8759) | 49 (7534) | 65 (14864) | 55 (25732) | 48 (31552) |
| funk | 68 (5226) | 65 (3986) | 99 (8988) | 62 (13017) | 42 (17247) |
| jazz | 66 (3067) | 64 (2787) | 74 (6741) | 65 (7062) | 52 (8707) |
| afrobeat | 100 (2310) | 75 (1860) | 92 (4014) | 82 (7985) | 62 (6868) |
| hiphop | 80 (1273) | 79 (1234) | 120 (2326) | 72 (3651) | 44 (3478) |
| neworleans | 52 (2096) | 52 (1648) | 70 (2907) | 57 (6389) | 46 (6864) |
| afrocuban | 62 (1842) | 70 (1469) | 64 (2926) | 65 (4506) | 52 (6129) |
| soul | 55 (655) | 49 (516) | 83 (1251) | 48 (1514) | 37 (968) |
| dance | 85 (1042) | 76 (1006) | 92 (2059) | 80 (2238) | 63 (3712) |
| reggae | 40 (435) | 53 (634) | 55 (1129) | 66 (1104) | 38 (1434) |
| punk | 66 (559) | 62 (503) | 74 (963) | 102.5 (1250) | 44 (913) |
| country | too few (249 from 2) | too few (184 from 2) | too few (449 from 2) | too few (767 from 2) | too few (685 from 2) |
| highlife | too few (474 from 2) | too few (454 from 2) | too few (605 from 2) | too few (1266 from 2) | too few (1207 from 2) |
| pop | too few (200 from 2) | too few (185 from 2) | too few (369 from 2) | too few (394 from 2) | too few (139 from 2) |
| blues | too few (257 from 1) | too few (194 from 1) | too few (446 from 1) | too few (333 from 1) | too few (1228 from 1) |
| gospel | too few (163 from 1) | too few (151 from 1) | too few (274 from 1) | too few (719 from 1) | too few (336 from 1) |
| middleeastern | too few (275 from 1) | too few (301 from 1) | too few (443 from 1) | too few (759 from 1) | too few (576 from 1) |
| all | 67 (40245) | 65 (33718) | 81 (72651) | 65 (106142) | 49 (119147) |
| all, in dB from the downbeat | +0.0 | −0.5 | +3.3 | −0.5 | −5.4 |

### Velocity by metric level: median (onsets), hi-hat and ride, struck

| style | downbeat (*) | beat 3 (+) | beats 2, 4 (+) | 8th off-beats (.) | 16th off-beats (,) |
|---|--:|--:|--:|--:|--:|
| rock | 79 (3111) | 72 (2977) | 96 (5487) | 67 (10084) | 56 (9447) |
| latin | 75 (1809) | 63 (1899) | 71 (3550) | 56 (5515) | 55 (4488) |
| funk | 89 (1643) | 72 (1750) | 102 (3279) | 68 (6363) | 35 (4977) |
| jazz | 64 (977) | 65 (981) | 78 (1852) | 71 (1912) | 62 (1722) |
| afrobeat | 127 (804) | 92 (727) | 94 (1327) | 92 (3098) | 68 (1129) |
| hiphop | 111 (488) | 102 (516) | 115 (919) | 80 (1998) | 45 (1375) |
| neworleans | 83 (253) | 83 (229) | 88.5 (496) | 72 (965) | 49 (561) |
| afrocuban | 73.5 (608) | 72 (411) | 70 (868) | 54 (1334) | 51 (1793) |
| soul | 61 (187) | 45 (223) | 81 (316) | 52 (851) | 42 (260) |
| dance | 80.5 (424) | 76.5 (418) | 66 (310) | 83 (1635) | 67 (1983) |
| reggae | 47.5 (208) | 68 (239) | 58 (467) | 66 (586) | 40 (565) |
| punk | 67 (173) | 62 (164) | 62 (312) | 84 (401) | too few (7 from 1) |
| country | too few (29 from 2) | too few (30 from 2) | too few (31 from 2) | too few (221 from 2) | too few (0 from 0) |
| highlife | too few (126 from 2) | too few (125 from 2) | too few (220 from 2) | too few (250 from 2) | too few (379 from 2) |
| pop | too few (73 from 2) | too few (89 from 2) | too few (174 from 2) | too few (257 from 2) | too few (84 from 1) |
| blues | too few (48 from 1) | too few (69 from 1) | too few (134 from 1) | too few (28 from 1) | too few (464 from 1) |
| gospel | too few (67 from 1) | too few (66 from 1) | too few (125 from 1) | too few (204 from 1) | too few (114 from 1) |
| middleeastern | too few (97 from 1) | too few (110 from 1) | too few (197 from 1) | too few (415 from 1) | too few (11 from 1) |
| all | 79 (11125) | 72 (11023) | 88 (20064) | 68 (36117) | 52 (29359) |
| all, in dB from the downbeat | +0.0 | −1.6 | +1.9 | −2.6 | −7.3 |
