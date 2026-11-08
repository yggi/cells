# 079 · A mix of cells with no voice is the sum of their values; a moving range's ends may be sliders, and centre ± reach is its sugar

**Date:** 2026-11-08 · **Status:** accepted (the owner on #576, 2026-11-08: "sum like mix, as suggested"; "A as core form, B as sugar") · Issues: #576 (a radio station as one cells piece), #571 (style across timescales), #536 (the style epic) · Read with [006](006-mix-algebra.md) (the mix's `+` and `*`), [066](066-a-wave-and-an-envelope-move.md) (a range moved by cells), [076](076-the-style-axes.md) (entropy is the reach) and 078 (every number may be a `free()`, #598)

## Context

A radio's style drifts by itself, and a hand may still lean it (#576).
Two things it needs had no spelling:

- **A drift made of several rates.** A sum of sample-and-holds at the section's, the song's and the set's rates drifts as music's slow fluctuations do (the Voss–McCartney construction; `docs/notes/571-style-at-every-scale.md`). Its weights are the axis's amplitude at each rate.
  - A moving parameter's cells only multiply (`lpf=0..1000 * &a * &b`).
  - A mix of cells with no voice, `&w [&a * .5 + &b * .5]`, is an error, since a mix sums sounds and needs one ("A gain inside a pitch sum", or "&a * &b has no voice").
  - So no text could sum two control lines.
- **A hand and the drift on one axis.** #576 rung 2 moves an axis by a cell (`artic=.2..0.9 * &drift`), within a fixed range.
  - A hand has no place to lean it: a range's ends are plain numbers (`lpf=free(200, 0..1000)..free(800, 0..1000) * &a` is `Unexpected '.'`).
  - Decision 078's table of places (#598) doesn't list a moving range's ends.

## Decision

1. **A mix of cells with no voice is the sum of their values,** each weighted by its gain: `&drift [&section * .5 + &song * .3 + &set * .2]`.
   - It is a line like any other, read where a moving parameter, a style's axis or a pick reads a cell: at each moment, the sum of what each term holds then.
   - The gains are weights. Where they sum to 1 and each term lies in 0..1, so does the sum, and the drift's spectrum is written in its weights.
   - What reads it holds it to the range it reads it into: an axis to the axis's.
   - A mix with a voice is a sound, as it was (006). The two are told apart by whether a voice is in it.
2. **A moving range's ends may be sliders:** `artic=free(.4, 0..1)..free(.8, 0..1) * &drift`. This is the core form.
   - The hand sets the window, and what moves it wanders inside.
   - Each end is a place decision 078 allows a `free()` at, its range within the parameter's or the axis's.
   - The ends may cross (`.8..0.4`), as a range written so already may: it reads downward.
3. **Centre ± reach is its sugar:** `artic=free(.6, 0..1) ± free(.2, 0..0.5) * &drift` is `(c − r)..(c + r)`.
   - The centre is the setpoint, and the reach is how far the drift may go: decision 076's entropy, on this axis.
   - Each end is held to the parameter's range.
   - `toCore` writes the range. Normalise keeps the spelling written.
   - `±` is the one new character. ASCII `+-` reads as it too.
4. **A moving axis read through a mix of styles** (`style=[&funk * .5, &mine * .5]` with `&mine` drifting) **is that mix's weighted sum**, by (1): the point where no axis moves, the series where one does. Rung 2's error for it retires.

**Why not** arithmetic in a parameter (`artic=.2..0.9 * (&a * .5 + &b * .5)`): a grammar of expressions inside every moving parameter, for what one cell already says.
**Why not** a built-in generator (`pink(8m, 32m, 128m)`): a mechanism in code that cells can spell in cells, and a spectrum hidden in its arguments' order.
**Why not** a word of its own for a sum of controls: the mix's `+` and gains already mean a weighted sum. Which it sums, sound or values, is told by whether a voice is there.
**Why not** centre ± reach as the core: it is the window written another way. One core form, and the sugar the setpoint reads more naturally in.

## Consequences

- **#576 rung 3:** the sum (1) and a moving axis through a mix (4).
  - *Radio*'s drift becomes walkers at three rates, summed.
  - Its snapshot moves, as the point; no other piece's does.
  - Rung 2's error for a mix retires.
- **#576 rung 4:** the window (2), and `±` (3) with its `toCore` and Normalise rows. A row is added to decision 078's table of places (`NUMBER_PLACES`) for a range's ends.
- **Jambot** (yggi/jambot#597): its radio's walk, and a player's lean, become a score's sum and window. A player's wish that fades stays the player's: a fade needs memory across sections, which a text doesn't keep.
- **Cell studio** draws the window's two sliders as it draws any `free()`, and a sum like a mix's wheel. Whether it draws a voiceless mix well is checked at its pin.
