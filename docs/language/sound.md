# Sound

Voices, waveforms, envelopes, volumes and articulation. How voices are combined is on [mix.md](mix.md).

## Voices

A voice is a cell looped at audio rate: `loop=440` plays its braid 440 times a second. Its braid is the waveform — values hold for their step, then **`map=`** makes them sound:

- **`amp`** (default) — lerp the braid's own range onto −1…1: `0 1` is a square; a sine is the braid `sin(12)`
- **`lin`** — the same, ramping from each value to the next: `0 1` is a triangle, the default braid a saw
- **`&table`** — look each value up first, then amp

With no braid a voice holds 0…11 of the 12 grid: a 12-step saw. Or name a built-in waveform with dough's **`s=`** (sine tri saw square pulse white pink brown). Levels and stereo are the mix's job; envelopes are cells, `map=adsr`. A voice with no envelope in its product plays quick and full. Rendering uses Tone.js.

Sound parameters use dough's names; any of them makes a cell a voice:

| parameter | what |
|---|---|
| `lpf=` `lpq=` | low-pass cutoff (Hz) and resonance; both can move |
| `hpf=` `hpq=` | high-pass cutoff (Hz) and resonance; both can move |
| `room=` | reverb send, 0–1; can move |
| `delay=` `delaytime=` `delayfeedback=` | echo send (0–1, can move), time (seconds or a clock), feedback (0–1) |
| `penv=` `pdec=` | a pitch drop on each note: its depth (semitones) and decay (seconds) |
| `distort=` | distortion: 0 clean, .3 gritty, 1 and more harsh |
| `crush=` | bit depth: 16 clean, 8 grainy, 3 and fewer rubble |

FM (`fm=` `ratio=` `index=`) and resonators (`body=` `ring=` `hard=`) are on [physics.md](physics.md). Dough's other names for these (`cutoff`, `reverb` …) still read, with a warning naming ours. Each parameter's meaning, and what it acts on, is in one table in the code, `src/engine/attributes.ts`; on a cell where it does nothing it is a warning.

```cells
&square loop=220 0 1
&tri loop=220 map=lin 0 1
&sine loop=220 sin(12)
&saw loop=C3
&lead s=saw loop=261.63 lpf=2200
```

A braid of voices (`&kit &bd &sd &hh`) is a table of voices: a pattern read through it, `&drums over=&kit step=&bar/2 0 2 1 2`, is a signal — mix it as it is, `[&drums * 0.6]`; its numbers pick the drum. Each member brings its own `env=` (a kick's long decay, a hat's short one); an envelope in the product (`[&env * &drums]`) wins over it.

## Parameters as cells

A sound parameter can be a range times cells, so it moves with the music: `lpf=110..3800 * &fenv * &accent * &knob` sweeps the filter from 110 to 3800 Hz by an envelope per note (`map=adsr`), accents (`map=amp`) and a slow knob (`map=lin`); `lpq=&res` takes a cell too. Parameters that are times take a clock as well as seconds: `delaytime=&bar*3/4` is a dotted eighth at whatever the tempo is.

```cells
&bar scan(4 4 4 4) step=120bpm
&accent map=amp step=&bar/4 1 .4 .8 .4
&fenv map=adsr .003 .18 .1 .06
&knob map=lin loop=&bar*16 .2 1 .35 .2
&res map=lin loop=&bar*32 6 19 6
&tb303 s=saw loop=A2 lpf=110..3800 * &fenv * &accent * &knob lpq=&res delaytime=&bar*3/4 delay=.22 delayfeedback=.35
```

## Envelopes: env= and pitch=

Envelopes are cells. A cell with **`map=adsr`** holds attack, decay, sustain and release (seconds; sustain a level). A voice carries it with **`env=`** — a volume acting on every note it plays — and its vibrato with **`pitch=`**, added to every note:

```cells
&lead s=saw loop=C4 env=&(map=adsr .01 .3 .4 .4) pitch=&(map=lin loop=5 0 .15 0 -.15 0)
```

Written in place they hang as petals of the voice; named, one envelope serves several voices (`&pluck map=adsr .005 .3 0 .2`, then `env=&pluck`). They're exactly what the same cells would be in the mix (`&tune * &env * &lead`, `(&tune + &vibrato) * &lead`) — written once, on the instrument. As a factor it shapes each note it multiplies, from the note's start through its release.

## Volume streams

`map=db` takes decibels: 0 full, −6 about half. A cell with **`map=amp`** in a product is a volume, not a pitch: its values multiply the level while notes sound (1 full, 0 silent; a rest is silence). `&accent map=amp step=&bar/2 1 .3 .6 .3` accents eighths; `&env map=amp loop=&theme 1 .7 .5 .3 0` is an envelope — one shape per note. With no moving pitch, a volume with `step=` starts the notes itself (a gate): `&mix [&hats * &hh]` plays a hi-hat on its steps, at their levels. (Planned: `gate(&rhythm) * …` to articulate explicitly; see [../roadmap.md](../roadmap.md).)

## map=lin everywhere

Values ramp to the next instead of holding: a voice's waveform (round its cycle), a volume (a fade, a swell — the last value holds until the braid starts again), a pitch (a gliding vibrato). In a product a `map=lin` cell is a volume; inside a pitch sum, `(&theme + &vibrato)`, it's a pitch.

## Articulation

Among the pitches acting on a voice, the one with `step=` timing starts notes; `loop=` terms bend them while they sound (vibrato); terms that don't move transpose.

Filters are one per voice (as on a monosynth): overlapping notes share the last envelope; see [../limits.md](../limits.md).
