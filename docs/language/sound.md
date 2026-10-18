# Sound

Voices, waveforms, envelopes, volumes and articulation. How voices are combined is on [mix.md](mix.md).

## Voices

A voice is a cell looped at audio rate: `loop=440` plays its braid 440 times a second. Its braid is the waveform — values hold for their step, then **`map=`** makes them sound:

- **`amp`** (default) — lerp the braid's own range onto −1…1: `0 1` is a square; a sine is the braid `sin(12)`
- **`lin`** — the same, ramping from each value to the next: `0 1` is a triangle, the default braid a saw
- **`&table`** — look each value up first, then amp

With no braid a voice holds 0…11 of the 12 grid: a 12-step saw.

**A voice alone plays its own pitch, held** ([decision 028](../decisions/028-the-smallest-piece.md)): in a product with nothing that starts notes (no pitch term, no volume with `step=` timing), the missing pitch is the pitch identity, as a missing volume is 1. So `&a loop=A4` alone, or `[&a * .5]`, is an oscillator: one note at the voice's own frequency from where play starts until it stops or the piece ends (`laps=` elsewhere), its own `env=` attacking once and holding at its sustain, its own `pitch=` bending it (a vibrato), and the levels in its product moving its volume (`[&a * &swell]` with `&swell map=lin loop=.25 0 1`). It doesn't end the piece or give it a length of its own. A kit, a resonator and a tape's read head alone keep their own meaning. Or name a built-in waveform with dough's **`s=`** (sine tri saw square pulse white pink brown). Levels and stereo are the mix's job; envelopes are cells, `map=adsr`. A voice with no envelope in its product plays quick and full. Rendering uses Tone.js.

Sound parameters use dough's names; any of them makes a cell a voice. Strudel's and dough's other names for them read as ours where they mean the same in the same units (`sound=`, `cutoff=`, `verb=`, `dt=` …, listed in [reference.md](reference.md#parameters); [decision 027](../decisions/027-on-top-of-strudel.md)): the text keeps what you wrote, an alias beside ours is the parameter given twice, and Shorten offers ours where it is shorter. Not read, as their meaning or scale differs here: `size=` (a reverb's size; ours is how large a cell is drawn), `dist=` (another scale than our `distort=`), `fmi=` `fmh=` (FM is a cell here: [physics.md](physics.md)), `vel=` `att=` and the envelopes (an envelope is a cell; a tie is `glide=`). Strudel's `clip=` is its `legato=`: it reads as ours, with a warning, since cells keeps one spelling, and Normalise rewrites it ([#28](https://github.com/yggi/cells/issues/28)).

| parameter | what |
|---|---|
| `lpf=` `lpq=` | low-pass cutoff (Hz) and resonance; both can move |
| `hpf=` `hpq=` | high-pass cutoff (Hz) and resonance; both can move |
| `room=` | reverb send, 0–1; can move |
| `delay=` `delaytime=` `delayfeedback=` | echo send (0–1, can move), time (seconds or a clock), feedback (0–1) |
| `pan=` | where it sits in stereo: 0 left, .5 centre (as without it), 1 right; the far side fades, the near one stays full. Past 0 or 1 it plays hard left or right, and warns; on a mix or the sound card it does nothing, and warns |
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

**A stepped braid of voices plays them:** `&groove step=16n &bd ~ &hh ~ [&bd,&sd] ~ &hh &hh*2` is a drum pattern by name, mixed as it is (`[&groove * .6]`); a chord of voices sounds together, a subsequence squeezes them into a step (`&bd [&hh &hh]`, `[&hh ~ &hh, &bd]`), and repeats, ratchets, holds and chance work as on any step. A braid of voices without `step=` that a groove splices is a drum motif: `&fill &sd &sd*2 ~ &hh`, then `&groove step=&bar*4 &bd ~ &fill &fill[::-1]` (spliced, reversed, nested as any braid). It is the pattern below, read through a kit of its voices, without writing the kit; a braid of voices that something reads with `over=` stays that kit.

```cells
&bar scan(1 1 1 1) step=120bpm
&bd s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .3 0 .05)
&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .04)
&hh s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&groove step=8n &bd &hh [&bd,&sd] &hh &bd &bd [&hh,&sd] &hh*2
&out map=sample [&groove * .6]
```

A braid of voices with no `step=` (`&kit &bd &sd &hh`) is a table of voices: a pattern read through it, `&drums over=&kit step=8n 0 2 1 2`, is a signal — mix it as it is, `[&drums * 0.6]`; its numbers pick the drum. A kit read only selects: in a product with a pitch, the pitch transposes the member picked, and a clock's varispeed bends it ([mix.md](mix.md#the-algebra-of-a-mix), [decision 029](../decisions/029-kits-pass-pitch.md)). Each member brings its own `env=` (a kick's long decay, a hat's short one); an envelope in the product (`[&env * &drums]`) wins over it. Each member brings its own balance too: **`gain=` on a voice** is its own gain (dough's `gain`, linear), times every gain it is played at (1 by default), so `&bd gain=.8` and `&sd gain=.4` in one kit play as `[&kick * &bd * .8, &snare * &sd * .4]` did, a pattern a drum.

**`oneshot`** on a voice's line makes it a hit: each note plays its envelope through (its attack and decay), whatever its step, as a drum machine's does. Without it a note lasts its step, so a kick with a .3 s decay on a grid of .125 s eighths is cut short; with it, kicks and hats can share one fine grid (`&beat step=&bar*2 &bd &hh [&bd,&cp] &hh`) and the kick still rings. It is opt-in: a voice without it plays as before.

**`glide=t`** on a voice (dough's `glide`) is the other way round: a run of single notes, each starting as the one before ends, is played as one note: its envelope once (no new attack), the pitch sliding to each next note over `t` seconds, as a bowed or blown line does. A rest or a chord ends the run, a hold (`@`) is part of it. `&lead glide=.1 s=tri …` with `&tune step=&bar*2 0 2 4 ~ 5 4 2@2` plays two phrases, each one breath. `glide=0` or none: each note its own. A voice is `oneshot` or gliding or neither, not both. With `legato=` (below), notes tie where they meet as they sound: a share under 1 leaves a gap, so each note is its own. (A run starts again after 256 notes: a loop with no rest is still breathed now and then.)

**`legato=`** on a line ([#94](https://github.com/yggi/cells/issues/94)) is its articulation, Strudel's `legato` (its `clip`): each note sounds its held length (its step, `@n`, `_`) times a share. `.5` is staccato, half of each note; `1` is as written, the same as no `legato=`; `1.5` sounds into the next note. The note keeps its start; nothing cuts it at the bar line or at the line's next onset, so a share over 1 on the last steps sounds past the bar line, whole, in the events and in MIDI out. Only a selector switching its part off and the line's end (`laps=`) cut it. Under a swing the share is of the note's written steps, and the swing places its end as it places its onset: Strudel's reading, whose `legato` scales a note's length before any swing ([#120](https://github.com/yggi/cells/issues/120)). Under `swing=16n:.6`, where an even sixteenth takes 1.2 steps' time and an odd one .8, a note on step 10 held 3 at `.425` ends at step 11.275 as written, 1.42 steps' time after its onset (.425 of the 3.2 steps' time it is held would be 1.36). Within one step it is the share of that step's time: a long eighth's half is longer than a short one's. Any clock that bends time (a scan's positions, a motor, a belt) places a note's end the same way, through its steps.
- **A number**, `legato=.32`, from .25 to 2.5 for the shares Jambot writes; above that plays, with no warning. A share of 0 or less is an error.
- **Left free**, `legato=free(.32, .25..2.5)`: the style's or the player's licence, a slider ([free.md](free.md)).
- **A cell of shares**, stepped on its own tap: `legato=&artic` with `&artic step=8n .5 1` sounds the notes in each first eighth at half their length, those in each second whole. The share is the one in force at the note's onset. A range scaled by cells reads as any moving parameter's: `legato=.5..1.5 * &k`.
- **The meter's default**: a line that taps a meter carrying `legato=16n:.5` (by level, [time.md](time.md#meters)) and states none sounds at the meter's share for its tap.
- It acts on the line that starts the notes (through a gate, its `play=` line), not on a voice; a `oneshot` voice plays its envelope through, whatever the share.

```cells
&bar meter("4/4") step=100bpm
&bass step=8n legato=.5 0 0 7 0 5 0 3 2
&stab step=4n legato=1.75 ~ ~ ~ [0,4,7]
&v s=saw loop=C2 env=&(map=adsr .005 .1 .7 .05)
&out map=sample [&bass * &v * .5, &stab * &v * .2]
```

```cells
&bar scan(1 1 1 1) step=120bpm
&bd oneshot s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh oneshot s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&beat step=8n &bd &hh &bd &hh
&out map=sample [&beat * .6]
```

## Parameters as cells

A sound parameter can be a range times cells, so it moves with the music: `lpf=110..3800 * &fenv * &accent * &knob` sweeps the filter from 110 to 3800 Hz by an envelope per note (`map=adsr`), accents (`map=amp`) and a slow knob (`map=lin`); `lpq=&res` takes a cell too. Parameters that are times take a clock as well as seconds: `delaytime=&bar*4/3` is a dotted eighth at whatever the tempo is.

```cells
&bar scan(4 4 4 4) step=120bpm
&accent map=amp step=16n 1 .4 .8 .4
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

`map=db` takes decibels: 0 full, −6 about half. A cell with **`map=amp`** in a product is a volume, not a pitch: its values multiply the level while notes sound (1 full, 0 silent; a rest is silence). `&accent map=amp step=&bar*2 1 .3 .6 .3` accents eighths; `&env map=amp loop=&theme 1 .7 .5 .3 0` is an envelope — one shape per note. With no moving pitch, a volume with `step=` starts the notes itself (a gate): `&mix [&hats * &hh]` plays a hi-hat on its steps, at their levels. (Planned: `gate(&rhythm) * …` to articulate explicitly; see [../roadmap.md](https://github.com/yggi/cell-studio/blob/main/docs/roadmap.md).)

## map=lin everywhere

Values ramp to the next instead of holding: a voice's waveform (round its cycle), a volume (a fade, a swell — the last value holds until the braid starts again), a pitch (a gliding vibrato). In a product a `map=lin` cell is a volume; inside a pitch sum, `(&theme + &vibrato)`, it's a pitch.

## Articulation

Among the pitches acting on a voice, the one with `step=` timing starts notes; `loop=` terms bend them while they sound (vibrato); terms that don't move transpose. Of several with `step=` timing, the finest starts notes and the coarser ones hold under it, as a melody moves over its harmony: `(&walk + &changes) * &bass` with `&walk step=&bar` and `&changes step=&bar/4 0 0 5 0` walks a bar at a time, each bar transposed by its change. Two at the same rate are an error (which one starts the notes?).

Filters are one per voice (as on a monosynth): overlapping notes share the last envelope; see [../limits.md](https://github.com/yggi/cell-studio/blob/main/docs/limits.md).
