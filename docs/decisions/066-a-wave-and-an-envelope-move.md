# 066 · A wave and an envelope's times move: `s=tri..square * &x`, and an envelope's slots by name, each a number or a range scaled by cells

**Date:** 2026-11-03 · **Status:** accepted (owner, 2026-10-31 on #405: "file an issue, that should be handled right away"; the spellings chosen and named on #411, as the issue asks) · Issues: #411, #391, #405, #81

*Extends [063](063-the-score-and-the-band.md) §3 (a voice reads the style as a moving parameter reads a cell) and [062](062-cells-renders-audio.md) §6 (both sound within R1).*

## Context

Decision 063 makes Jambot's `timbreOf` (yggi/jambot `packages/engine/src/sound.ts` @ 227aa74) lines of the default instruments: a voice reads `&style[artic]` as `lpf=` does. #391 found two of its readings no line could say:

- **the lead's wave:** a soft triangle at legato to a bright square at staccato. `s=` is one word, and a mix of two voices under one gate sends two MIDI notes for each note (probed on #405);
- **the chords' attack and release:** `lerp(.3, .01, artic)` s and `lerp(.7, .12, artic)` s. An envelope's four slots were plain numbers.

## Decision

### 1. An envelope's slots by name

A `map=adsr` cell may write its four slots by name, as a style writes its axes (063 §3): `attack=`, `decay=`, `sustain=`, `release=`. Each is a number, or a range scaled by cells, read as a moving parameter is (`lpf=300..1200 * &style[artic]`):

```text
&chords map=adsr attack=.3..0.01 * &style[artic] decay=0 sustain=1 release=.7..0.12 * &style[artic]
```

- **A moving slot is read at each note's start:** a note plays the envelope it starts with, so a glide (`style=a..b`) shortens the attack of later notes, not of one note as it sounds.
- **By name is by position:** `attack=.01 decay=.3 sustain=.5 release=.4` is `.01 .3 .5 .4`, and every slot is named; both spellings at once, a slot given twice or one missing, and a moving slot with no range are errors.
- **On any other cell `attack=` stays retired**, Strudel's spelling (an envelope is a cell), and its message now shows the slots by name.

### 2. A blend of two waves

`s=` may be two built-in waves and the cells that set the share of the second: `s=tri..square * &style[artic]`.

- **One voice, one note:** MIDI out sends one note for each, whatever the share.
- **The share is read at each note's start**, from 0 (the first wave) to 1 (the second), as a moving parameter's range of 0 to 1.
- **The law:** the two waves' harmonics crossfaded, each at the peak it has alone, so the blend is the first wave at 0 and the second at 1, exactly. Jambot weights its triangle 1.8 against the square: that is a level, which the lead's card and gain say in cells, not the blend.
- **Of two waves** of the four (sine, tri, saw, square, or their other names); a noise is an error, and so is a blend with no cells.

### 3. The default instruments use them

- `lead`: `s=tri..square * &style[artic]`, its attack `.04..0.006 * &style[artic]`;
- `keys` and `pad`: `env=&(map=adsr attack=.3..0.01 * &style[artic] decay=0 sustain=1 release=.7..0.12 * &style[artic])`.

Where no line writes the style, they read the centre of style space (#405): the lead's blend at .5, the chords' attack .155 s and release .41 s.

## Why

- **One form for what moves:** a range scaled by cells is how every moving parameter is written, so an envelope's slot and a wave's share read as `lpf=` does, and `&style[artic]` reaches them the same way.
- **Names before positions:** `attack=` says which slot moves; a moving value inside `&(map=adsr .3..0.01 * &x 0 1 …)` would have mixed braid steps and attribute syntax in one braid.
- **Additions to Strudel's spellings (027):** Strudel's `s=` takes one sound, and its envelope attributes stay retired.

**Why not** a mix of two voices under the gate: it sends two notes. **Why not** an equal-power crossfade: at its middle it is louder than either end, and no reader asked for it. **Why not** a slot moving while a note sounds: an attack is over before most changes could reach it, and a release is decided at the note's end; read at the start, a note is one envelope, as the renderer and every frontend play it.

## Consequences

- No example moves: none writes a slot by name or a blend.
- What a frontend sees at its next pin: a voice's `s=` may carry a blend (`paramCells.s.to`, the second wave, and `params.s` the first); a played note's `params.s` is the share it starts on; a note's `env` is the envelope it starts with; a `map=adsr` cell may have `paramCells` (its moving slots). A synth that reads `params.s` as a word reads the first wave, and plays it.
- Jambot's `timbreOf` is now the default instruments' lines in full, but the bass's triangle under swing (`eighthSwing`), which reads the meter, not the style.
