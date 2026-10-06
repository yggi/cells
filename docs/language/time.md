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
- **A selector** is a stepped cell reading a table of parts — an arrangement: it picks which part plays, and each part restarts on its pick (`&theme * &(over=&band step=… 0 1 2)`). The Pop song, Swing blues and 5 to 12 examples are arranged by selectors.

```cells-fragment
&bar scan(27 23 26 24) step=free(66bpm, 40..96) laps=30
```
