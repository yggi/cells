# Tuning

Grids: how positions become frequencies, and how they're named and coloured.

- **The default grid** is `&fifths12TET cycle=12 map=edo`: 12 to the octave.
- **`map=edo`** — `&edo19 cycle=19 map=edo` turns positions into frequencies, 19 equal steps per octave. A grid reads nothing and has no braid.
- **`map=ed(r)`** divides any ratio, not just the octave: `cycle=25 map=ed(5)` is Stockhausen's Studie II scale (25 steps to 5:1), `cycle=9 map=ed(3/2)` Wendy Carlos' alpha (nine steps to a pure fifth, no octave), `cycle=13 map=ed(3)` Bohlen–Pierce. `map=edo` is `map=ed(2)`. Climbing a lap multiplies by r.
- **`map=ratios`** — a grid whose braid lists one period's tones as ratios, the last the period. Numbers can be fractions anywhere (`9/8`).
- **Note names** are rates from the environment, tuned from `A4` (440 by default): `loop=C4`, `loop=F#3`, `loop=Bb2`.
- **Colour follows the voice's grid**: a rainbow per period, by position (on 12 to the octave: C red, D yellow, G light blue …) — in braids, in the spectrum wheels (from the voice's pitch 0), on the edges. A mix and the sound card follow the grid all their voices are on; voices on several grids collide and the mix shows no colour, unless it says `show=mix:&edo19` ([display.md](display.md)). A voice on another grid names its note by position on it, with the nearest 12-tone note and its distance in cents (`0 · G2 +35¢`).

```cells
&edo19 cycle=19 map=edo
&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2
&alpha cycle=9 map=ed(3/2)
&bp cycle=13 map=ed(3)
```

For grids tuned to a struck object's partials (a beam rings 1 : 2.76 : 5.40 : 8.93), see [physics.md](physics.md).
