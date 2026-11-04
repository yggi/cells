# Tuning

Grids: how positions become frequencies, and how they're named and coloured.

- **The default grid** is `&fifths12TET map=edo(12)`: 12 to the octave.
- **`map=edo(n)`** — `&edo19 map=edo(19)` turns positions into frequencies, 19 equal steps per octave (`map=edo` alone is 12). A grid reads nothing and has no braid. Its size is the map's ([#75](https://github.com/yggi/cells/issues/75)): `cycle=19 map=edo`, the old way, still reads, warns, and Migrate rewrites it.
- **`map=ed(n, r)`** divides any ratio into n steps, not just the octave, as "25ed5" reads: `map=ed(25, 5)` is Stockhausen's Studie II scale (25 steps to 5:1), `map=ed(9, 3/2)` Wendy Carlos' alpha (nine steps to a pure fifth, no octave), `map=ed(13, 3)` Bohlen–Pierce. `map=edo(n)` is `map=ed(n, 2)`; `map=ed(r)` alone is 12 steps. Climbing a lap multiplies by r.
- **`map=ratios`** — a grid whose braid lists one period's tones as ratios, the last the period. Numbers can be fractions anywhere (`9/8`).
- **Note names** are rates from the environment, tuned from `A4` (440 by default): `loop=C4`, `loop=F#3`, `loop=Bb2`.
- **Colour follows the voice's grid**: a rainbow per period, by position (on 12 to the octave: C red, D yellow, G light blue …) — in braids, in the spectrum wheels (from the voice's pitch 0), on the edges. A mix and the sound card follow the grid all their voices are on; voices on several grids collide and the mix shows no colour, unless it says `show=mix:&edo19` ([display.md](display.md)). A voice on another grid names its note by position on it, with the nearest 12-tone note and its distance in cents (`0 · G2 +35¢`).

```cells
&edo19 map=edo(19)
&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2
&alpha map=ed(9, 3/2)
&bp map=ed(13, 3)
```

For grids tuned to a struck object's partials (a beam rings 1 : 2.76 : 5.40 : 8.93), see [physics.md](physics.md).
