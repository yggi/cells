# The language

A minimal language for music where everything is a **cell**: a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid. This page is the map; each topic has one page.

One cell per line; attributes go anywhere.

```cells
&bar scan(27 23 26 24) step=84bpm                  # the clock, a bent 4/4 bar
&key step=cycle(&theme) stride=7                   # the 12; a fifth per pass of &theme
&scale over=&key scan(2 1 2 2 1 2 2) step=cycle(&key)   # Aeolian; a degree per circle of keys
&theme over=&scale step=&bar 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2

&lead s=saw loop=261.63 lpf=2200          # a voice
&vibrato loop=5 0 .1 .15 .1 0 -.1 -.15 -.1         # a pitch, ±0.15 semitones, 5 times a second
&mix [(&theme + &vibrato) * &lead]
&out loop=SAMPLE_RATE map=sample &mix &mix
```

Everything is indexing and moving a helix.

| page | what it says |
|---|---|
| [cell.md](cell.md) | the anatomy of a line: name, attributes, steps, modifiers, `&( )`, `off` |
| [braid.md](braid.md) | what a braid is made of: generators, picks, slices, shifts, transposing |
| [tables.md](tables.md) | `over=`, `shift=`, `scale()`: reading through a table |
| [time.md](time.md) | `step=`, `loop=`, `cycle=`, `stride=`, meters, laps, selectors |
| [tuning.md](tuning.md) | grids: `map=edo`, `ed(r)`, `ratios`; note names; colour |
| [free.md](free.md) | `free()`: a number left to the performer |
| [mix.md](mix.md) | mixes, pitches and signals, the sound card |
| [sound.md](sound.md) | voices, waveforms, envelopes, volumes, articulation |
| [physics.md](physics.md) | motors, belts, tape, resonators, FM |
| [display.md](display.md) | titles, tags, labels, `show=`, `level=` |

The code is the single source of truth: the graph draws exactly what is written, and every edit made in it is a rewrite of a cell's line ([../architecture.md](../architecture.md)).
