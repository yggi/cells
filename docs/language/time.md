# Time

What moves a cell: `step=` and `loop=`, the chains that scale them, `stride=`, meters, laps and selectors.

## step= and loop=

`step` counts single steps, `loop` whole turns of the braid (a k-step braid: `loop=r` is `step=r·k`):

|          | rate (`1`, `84bpm`, `440hz`) | `&x`               | `cycle(&x)`            |
|----------|------------------------------|--------------------|------------------------|
| `step=`  | one step per second          | one per step of &x | one per cycle of &x    |
| `loop=`  | whole braid per second       | whole braid per step of &x | whole braid per cycle of &x |

Driven forms take a chain of `*n` (once per n) and `/n` (n per one), read left to right, n any positive number: `step=&bar*2/3` is triplets — three steps per two.

- **`stride=n`** — each step moves a stepped table n places (`stride=7`: fifths).
- **`cycle=n`** — how many before it comes round; see [tables.md](tables.md).
- Rates can be a **free** number: `step=free(90bpm, 60..240)`; see [free.md](free.md).

```cells
&bar scan(4 4 4 4) step=84bpm
&tune step=&bar*2/3 0 2 4
&fast step=&bar/2 0 1
```

## Meters

A meter is a cell whose braid is a `scan`: `scan(27 23 26 24)` is a bent 4/4 bar, `scan(3 3 2)` the tresillo. A generated meter places its steps within the bar; other clocks step evenly.

## Laps and selectors

- **`laps=n`** — a clock plays n laps, then nothing it drives sounds: a piece that ends. The transport stops at the end.

```cells-fragment
&bar scan(27 23 26 24) step=free(66bpm, 40..96) laps=30   # thirty bars, then it ends
```

- **A selector** is a stepped cell reading a table of parts — an arrangement. A part is a cell holding a mix; a table lists the parts; the selector steps through the table, a section per step, and each entry names the parts that play (a chord of numbers plays several together). A part picked starts from its top. Pop song and 8-bit: Korobeiniki are arranged this way.

```cells
&bar scan(1 1 1 1) step=100bpm
&lead s=saw loop=C4
&bass s=saw loop=C2
&tune step=&bar 0 2 4 5
&roots step=&bar 0
&tunePart [&tune * &lead * .3]
&bassPart [&roots * &bass * .5]
&parts &tunePart &bassPart
&song over=&parts step=&bar*4 laps=1 [1] [0,1] [0,1]
&out loop=SAMPLE_RATE map=sample &song
```

The transport marks a selector's sections and jumps to them ([../ui/transport.md](../ui/transport.md)). Selectors reading in a voice's or a melody's position are not built ([../limits.md](../limits.md)).
