# The language

A minimal language for music where everything is a **cell**: a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid. This page is the map; each topic has one page.

The smallest piece that sounds is one line ([decision 028](https://github.com/yggi/cells/blob/main/docs/decisions/028-the-smallest-piece.md)):

```cells
&a loop=A4                # an oscillator: its braid turned 440 times a second
```

A cell looped at an audio rate is a voice, and a voice alone plays its own pitch, held as long as the piece plays: here a 12-step staircase saw at 440 Hz (the blank braid, the 12 of the grid). With no sound card written, it is heard through a built-in one ([mix.md](mix.md#the-sound-card)). (Strudel's smallest piece is an event, `note("a4")`; ours is an oscillator.)

One cell per line; attributes go anywhere.

```cells
&bar scan(27 23 26 24) step=&tempo                 # the clock, a bent 4/4 bar
&tempo step=84bpm
&key step=cycle(&theme) stride=7                   # the 12; a fifth per pass of &theme
&scale over=&key scan(2 1 2 2 1 2 2) step=cycle(&key)   # Aeolian; a degree per circle of keys
&theme over=&scale step=4n 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2

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
| [display.md](display.md) | titles, tags, labels, `show=`, loudness (the card's `postgain=`) |
| [reference.md](reference.md) | the syntax reference: every form the parser reads, with an example (generated from the parser) |

The code is the single source of truth: the graph draws exactly what is written, and every edit made in it is a rewrite of a cell's line ([../architecture.md](https://github.com/yggi/cells/blob/main/docs/architecture.md)).

## A name is only a name

**Alpha substitution is a core property of the language** ([decision 075](https://github.com/yggi/cells/blob/main/docs/decisions/075-a-name-is-only-a-name.md)): rename every name a text defines, consistently and to names it doesn't write, and it plays what it played (S1, every event alike to the ear), says what it said (its diagnostics, the names renamed), and is read the same by the default performer. A cell's meaning is its line, never its name. The meter is `&bar` and the key `&key` by convention only: Normalise writes those names for people, and nothing reads them. A template reads only what its signature declares, and a `from` line binds its arguments ([use.md](use.md), decision 065), so `&m from meter &t` with `&t step=96bpm` plays what `&bar from meter &tempo` with `&tempo step=96bpm` plays. The fit by signature (`useOn`, `fitsAs`) binds nothing by name either (#454). A text that offers lines to its readers says which, by a signature of heads alone (`&harm, &key from`): that is its interface, declared, never inferred from a name.

`src/engine/alpha.test.ts` checks this for every example, twice. First with its `from` lines written in, every name renamed: that is the language alone. Then as written, every name the text binds renamed, and every name a `from` line takes (`&bd` as `&zq0=bd`): that is the language with its library. Every example holds both ways; the test lists no exception. What had made a name mean something, each closed on #560:

- **A drum's MIDI note** is its `note=` ([midi.md](midi.md)), not its General MIDI name.
- **A `from` line renames what it takes**, `&kick=bd from gm_kit` ([use.md](use.md)).
- **Every fragment of the library reads only what it defines or declares**: the instruments their `(&style)`, the performers their voice and style, the band the score's parts, the grooves their drums.
- **The default performer reads values** (the feel's version 3, yggi/music-commons `contracts/feel`): a part is `part=` on a performer's role cell or on a line, a drum role `role=` on a drum line ([mix.md](mix.md)). A line named `&bass` that declares none plays as written.

## For Strudel users

Cells sits on top of Strudel and dough as TypeScript sits on JavaScript ([decision 027](https://github.com/yggi/cells/blob/main/docs/decisions/027-on-top-of-strudel.md)): a step form spelled as in Strudel's mini-notation means what it means there (`~` `x!n` `x@n` `x*n` `_` `[a b]` `[a, b]` `[a|b]` `x?p` `euclid(k, n, r)`), and a sound parameter keeps dough's or Strudel's name only where it means the same (their other names read as ours: [sound.md](sound.md#voices)). The rest is a different model, not another spelling:

| Strudel | cells | |
|---|---|---|
| `n("0 2 4")` | `0 2 4` | a number is an index into the table the cell reads ([cell.md](cell.md)) |
| `note("c e g")` | `C E G` | a name is a pitch; left out, the octave is 4 (Strudel's is 3) |
| `.scale("C:minor")` | `over=scale("C:minor")` | every scale name tonal knows, and ours ([tables.md](tables.md)) |
| `.scaleTranspose(n)` · `.transpose(n)` | `&x^n` · `&x^$n` | degrees of the table · steps of the grid ([braid.md](braid.md)) |
| `.early(1/4)` | `&x[1:] &x[:1]` | a rotation (of four steps); `&x[<<n]` turns too, but what wraps climbs a lap |
| `.rev()` | `&x[::-1]` | a slice, Python-style |
| `sine2` `saw2` `tri2` `square2` | `sin(n)` `saw(n)` `tri(n)` `square(n)` | a cycle in n steps, a braid: a waveform or a swell |
| `.range(lo, hi)` | `lpf=lo..hi * &x` | a range a cell moves ([sound.md](sound.md)) |
| `.pick(…)` · `.inhabit(…)` | a selector, `over=&sections` | switches whole sections on a meter's bus ([time.md](time.md)) |
| `.bank("tr808")` | a kit, `&kit &bd &sd &hh` | a table of voices, its numbers pick the drum ([sound.md](sound.md)) |
| `setcps(.5)` | `loop=` on a meter | every cell has a clock of its own; there is no global cps ([time.md](time.md)) |
| `.fm(n)` `.fmh(r)` | `fm=&op` `ratio=` `index=` | FM names a modulator cell, for now ([decision 030](https://github.com/yggi/cells/blob/main/docs/decisions/030-fm-feedback.md) will align it) |
| `.gain()` · `.postgain()` · `.velocity()` | `gain=` · the card's `postgain=` · a gate's `level=` | loudness is a product: a voice's own, the master, a gate's ([mix.md](mix.md)) |
| `s("hh:0:.5")` | `&hh:0:.5` | a hit's own gain |
| `.lpq(q)` | `lpq=` | Strudel's Q, not dough's 0–1 |
| `.distort(d)` | `distort=` | on a scale of its own: 0 clean, 1 harsh |
| `.legato(n)` · `.clip(n)` | `legato=n` | Strudel's: a note's written length times n, before any swing; a tie that slides is dough's `glide=` ([sound.md](sound.md)) |
| `s("bd")` and samples | voices made of braids, `s=saw` | no samples |

```cells
&bar meter("4/4") step=&tempo                                 # setcps(.5): this meter's own clock
&tempo step=120bpm
&tune over=scale("C:minor:pentatonic") step=8n 0 2 4 2 [3 4] ~ 4 _
&lead sound=saw loop=C4 cutoff=1200                           # sound= and cutoff= read as s= and lpf=
&mix [&tune * &lead, &tune^2 * &lead * .5]                     # n(…).scaleTranspose(2), quieter
```
