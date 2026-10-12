# Sound

Voices, waveforms, envelopes, volumes and articulation. How voices are combined is on [mix.md](mix.md).

## Voices

A voice is a cell looped at audio rate: `loop=440` plays its braid 440 times a second. Its braid is the waveform — values hold for their step, then **`map=`** makes them sound:

- **`amp`** (default) — lerp the braid's own range onto −1…1: `0 1` is a square; a sine is the braid `sin(12)`
- **`lin`** — the same, ramping from each value to the next: `0 1` is a triangle, the default braid a saw
- **`&table`** — look each value up first, then amp

With no braid a voice holds 0…11 of the 12 grid: a 12-step saw.

**A voice alone plays its own pitch, held** ([decision 028](../decisions/028-the-smallest-piece.md)): in a product with nothing that starts notes (no pitch term, no volume with `step=` timing), the missing pitch is the pitch identity, as a missing volume is 1. So `&a loop=A4` alone, or `[&a * .5]`, is an oscillator: one note at the voice's own frequency from where play starts until it stops or the piece ends (`laps=` elsewhere), its own `env=` attacking once and holding at its sustain, its own `pitch=` bending it (a vibrato), and the levels in its product moving its volume (`[&a * &swell]` with `&swell map=lin loop=.25 0 1`). It doesn't end the piece or give it a length of its own. A kit, a resonator and a tape's read head alone keep their own meaning. Or name a built-in waveform with dough's **`s=`** (sine tri saw square pulse white pink brown). Levels and stereo are the mix's job; envelopes are cells, `map=adsr`. A voice with no envelope in its product plays quick and full. Rendering uses Tone.js.

Sound parameters use dough's names; any of them makes a cell a voice. Strudel's and dough's other names for them (`cutoff=`, `verb=` …, listed in [reference.md](reference.md)) aren't read: each is an error that names ours.

| parameter | what |
|---|---|
| `lpf=` `lpq=` | low-pass cutoff (Hz) and resonance; both can move |
| `hpf=` `hpq=` | high-pass cutoff (Hz) and resonance; both can move |
| `room=` | reverb send, 0–1; can move |
| `delay=` `delaytime=` `delayfeedback=` | echo send (0–1, can move), time (seconds or a clock), feedback (0–1) |
| `pan=` | where it sits in stereo: 0 left, .5 centre (as without it), 1 right; the far side fades, the near one stays full |
| `distort=` | distortion: 0 clean, .3 gritty, 1 and more harsh |
| `crush=` | bit depth: 16 clean, 8 grainy, 3 and fewer rubble |

FM (`fm=` `ratio=` `index=`) and resonators (`body=` `ring=` `hard=`) are on [physics.md](physics.md). Each parameter's meaning, and what it acts on, is in one table in the code, `src/engine/attributes.ts`; on a cell where it does nothing it is a warning.

```cells
&square loop=220 0 1
&tri loop=220 map=lin 0 1
&sine loop=220 sin(12)
&saw loop=C3
&lead s=saw loop=261.63 lpf=2200
```

**A stepped braid of voices plays them:** `&groove step=&bar*4 &bd ~ &hh ~ [&bd,&sd] ~ &hh &hh*2` is a drum pattern by name, mixed as it is (`[&groove * .6]`); a chord of voices sounds together, a subsequence squeezes them into a step (`&bd [&hh &hh]`, `[&hh ~ &hh, &bd]`), and repeats, ratchets, holds and chance work as on any step. A braid of voices without `step=` that a groove splices is a drum motif: `&fill &sd &sd*2 ~ &hh`, then `&groove step=&bar*4 &bd ~ &fill &fill[::-1]` (spliced, reversed, nested as any braid). It is the pattern below, read through a kit of its voices, without writing the kit; a braid of voices that something reads with `over=` stays that kit.

```cells
&bar scan(1 1 1 1) step=120bpm
&bd s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .3 0 .05)
&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .04)
&hh s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&groove step=&bar*2 &bd &hh [&bd,&sd] &hh &bd &bd [&hh,&sd] &hh*2
&out map=sample [&groove * .6]
```

A braid of voices with no `step=` (`&kit &bd &sd &hh`) is a table of voices: a pattern read through it, `&drums over=&kit step=&bar*2 0 2 1 2`, is a signal — mix it as it is, `[&drums * 0.6]`; its numbers pick the drum. Each member brings its own `env=` (a kick's long decay, a hat's short one); an envelope in the product (`[&env * &drums]`) wins over it. Each member brings its own balance too: **`gain=` on a voice** is its own gain (dough's `gain`, linear), times every gain it is played at (1 by default), so `&bd gain=.8` and `&sd gain=.4` in one kit play as `[&kick * &bd * .8, &snare * &sd * .4]` did, a pattern a drum.

**`oneshot`** on a voice's line makes it a hit: each note plays its envelope through (its attack and decay), whatever its step, as a drum machine's does. Without it a note lasts its step, so a kick with a .3 s decay on a grid of .125 s eighths is cut short; with it, kicks and hats can share one fine grid (`&beat step=&bar*2 &bd &hh [&bd,&cp] &hh`) and the kick still rings. It is opt-in: a voice without it plays as before.

**`glide=t`** on a voice (dough's `glide`) is the other way round: a run of single notes, each starting as the one before ends, is played as one note: its envelope once (no new attack), the pitch sliding to each next note over `t` seconds, as a bowed or blown line does. A rest or a chord ends the run, a hold (`@`) is part of it. `&lead glide=.1 s=tri …` with `&tune step=&bar*2 0 2 4 ~ 5 4 2@2` plays two phrases, each one breath. `glide=0` or none: each note its own. A voice is `oneshot` or gliding or neither, not both. (Strudel's `legato`, a note's length against its step, is another thing; cells has no `legato=` yet.) (A run starts again after 256 notes: a loop with no rest is still breathed now and then.)

```cells
&bar scan(1 1 1 1) step=120bpm
&bd oneshot s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh oneshot s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&beat step=&bar*2 &bd &hh &bd &hh
&out map=sample [&beat * .6]
```

## Parameters as cells

A sound parameter can be a range times cells, so it moves with the music: `lpf=110..3800 * &fenv * &accent * &knob` sweeps the filter from 110 to 3800 Hz by an envelope per note (`map=adsr`), accents (`map=amp`) and a slow knob (`map=lin`); `lpq=&res` takes a cell too. Parameters that are times take a clock as well as seconds: `delaytime=&bar*4/3` is a dotted eighth at whatever the tempo is.

```cells
&bar scan(4 4 4 4) step=120bpm
&accent map=amp step=&bar*4 1 .4 .8 .4
&fenv map=adsr .003 .18 .1 .06
&knob map=lin loop=&bar/16 .2 1 .35 .2
&res map=lin loop=&bar/32 6 19 6
&tb303 s=saw loop=A2 lpf=110..3800 * &fenv * &accent * &knob lpq=&res delaytime=&bar*4/3 delay=.22 delayfeedback=.35
```

## Envelopes: env= and pitch=

Envelopes are cells. A cell with **`map=adsr`** holds attack, decay, sustain and release (seconds; sustain a level). A voice carries it with **`env=`** — a volume acting on every note it plays — and its vibrato with **`pitch=`**, added to every note:

```cells
&lead s=saw loop=C4 env=&(map=adsr .01 .3 .4 .4) pitch=&(map=lin loop=5 0 .15 0 -.15 0)
```

Written in place they hang as petals of the voice; named, one envelope serves several voices (`&pluck map=adsr .005 .3 0 .2`, then `env=&pluck`). They're exactly what the same cells would be in the mix (`&tune * &env * &lead`, `(&tune + &vibrato) * &lead`) — written once, on the instrument. As a factor it shapes each note it multiplies, from the note's start through its release.

**A pitch shape** is written the way moving parameters are (below): a range in semitones scaled by an envelope, `pitch=lo..hi * &(map=adsr …)`. Each note's pitch follows the envelope from `lo` to `hi` and back, in seconds, whatever the note's length. With no attack it starts at the top: a drop, the click of a kick drum.

```cells
&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)
```

## Volume streams

`map=db` takes decibels: 0 full, −6 about half. A cell with **`map=amp`** in a product is a volume, not a pitch: its values multiply the level while notes sound (1 full, 0 silent; a rest is silence). `&accent map=amp step=&bar*2 1 .3 .6 .3` accents eighths; `&env map=amp loop=&theme 1 .7 .5 .3 0` is an envelope — one shape per note. With no moving pitch, a volume with `step=` starts the notes itself (a gate): `&mix [&hats * &hh]` plays a hi-hat on its steps, at their levels. (Planned: `gate(&rhythm) * …` to articulate explicitly; see [../roadmap.md](../roadmap.md).)

## map=lin everywhere

Values ramp to the next instead of holding: a voice's waveform (round its cycle), a volume (a fade, a swell — the last value holds until the braid starts again), a pitch (a gliding vibrato). In a product a `map=lin` cell is a volume; inside a pitch sum, `(&theme + &vibrato)`, it's a pitch.

## Articulation

Among the pitches acting on a voice, the one with `step=` timing starts notes; `loop=` terms bend them while they sound (vibrato); terms that don't move transpose. Of several with `step=` timing, the finest starts notes and the coarser ones hold under it, as a melody moves over its harmony: `(&walk + &changes) * &bass` with `&walk step=&bar` and `&changes step=&bar/4 0 0 5 0` walks a bar at a time, each bar transposed by its change. Two at the same rate are an error (which one starts the notes?).

Filters are one per voice (as on a monosynth): overlapping notes share the last envelope; see [../limits.md](../limits.md).
