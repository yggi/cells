# Time

What moves a cell: `step=` and `loop=`, the chains that scale them, `stride=`, meters, laps and selectors.

## step= and loop=

`step` counts single steps, `loop` whole turns of the braid (a k-step braid: `loop=r` is `step=r·k`):

|          | rate (`1`, `84bpm`, `440hz`) | `&x`               | `cycle(&x)`            |
|----------|------------------------------|--------------------|------------------------|
| `step=`  | one step per second          | one per step of &x | one per cycle of &x    |
| `loop=`  | whole braid per second       | whole braid per step of &x | whole braid per cycle of &x |

Driven forms take a chain of `*n` (once per n) and `/n` (n per one), read left to right, n any positive number: `step=&bar*2/3` is triplets — three steps per two.

A played cell starts at most 2,000 notes a second (`MAX_NOTES_PER_SECOND`, `src/engine/program.ts`): faster, `step=1000000`, is an error, and the player keeps the last piece that compiled. Cells at audio rate that start no notes (a voice's wave, a vibrato) aren't counted.

- **`stride=n`** — each step moves a stepped table n places (`stride=7`: fifths).
- **`cycle=n`** — how many before it comes round; see [tables.md](tables.md).
- Rates can be a **free** number: `step=free(90bpm, 60..240)`; see [free.md](free.md).

```cells
&bar scan(4 4 4 4) step=84bpm
&tune step=&bar*2/3 0 2 4
&fast step=&bar/2 0 1
```

## Meters

A meter is a cell whose braid is a `scan`: `scan(27 23 26 24)` is a bent 4/4 bar, `scan(3 3 2)` the tresillo. A scan places its steps within the bar; other clocks step evenly.

**`meter(signature, steps a beat)`** writes a bar as levels, one per step: 0 the downbeat, 1 a beat, then finer subdivisions. `meter("4/4", 2)` is eight steps, `*.+.+.+.`; `meter("6/8")` six; levels can be written directly, `meter("*.+.+..")`. Read through a kit, each level picks its own sound (the Metronome).

- **`beat=n`** — how many of a meter's steps make a beat: its bpm counts beats, so `beat=4` steps in sixteenths at a quarter-note tempo. `meter(…)` sets it from its second number.
- **`swing=r`** — of each pair of steps, the second starts r of the way through the pair (.5 straight, .67 a triplet swing). It swings a meter written as a list or `meter(…)`; a `scan` places its steps itself, so its swing is written into it (`scan(2 1)`, as in the blues).

```cells
&bar meter("4/4", 2) step=100bpm swing=.6
&tick s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&bar * &tick]
```

## Laws

A cell with **`law=`** has its notes computed by a law instead of written: `law=fiveto12` is the 5 to 12 cycle, a day of music (`src/engine/fiveto12.ts`). The law reads the day through **`over=&day`**: a day meter, a clock whose loop is a day, `&day scan(1!24) loop=1d`. **`anchor=hh.mm`** on that clock is the time of day it stands at when play starts (`anchor=11.55`); written on the law itself, it is a warning that says where it goes. Drawn **`show=sun`**, the day meter is a 24-hour dial, noon at the top. Rates take time units: `min` `h` `d` `wk` (`loop=1d` is one lap a day). See the example *5 to 12*.

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
