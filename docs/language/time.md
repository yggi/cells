# Time

What moves a cell: `step=` and `loop=`, the chains that scale them, `stride=`, meters, laps and selectors.

## step= and loop=

`step` counts single steps, `loop` whole turns of the braid (a k-step braid: `loop=r` is `step=r·k`):

|          | rate (`1`, `84bpm`, `440hz`) | `&x`               | `cycle(&x)`            |
|----------|------------------------------|--------------------|------------------------|
| `step=`  | one step per second          | one per step of &x | one per cycle of &x    |
| `loop=`  | whole braid per second       | whole braid per step of &x | whole braid per cycle of &x |

Driven forms take a chain of `*n` (n per one: faster) and `/n` (one per n: slower), read left to right, n any positive number: `step=&bar*4` is four steps per step of `&bar`, `&bar/2` one per two, `&bar*3/2` triplets — three steps per two. The signs mean what they mean on a step (`x*n`, a ratchet) and in Strudel (`fast`, `slow`). On a parameter that takes a time from a clock (`delaytime=`, a tape's `length=`, a head's `at=`), the time is one step of the clock so made: `delaytime=&bar*2` is half a step of `&bar`, `length=&bar/4` four steps.

A played cell starts at most 2,000 notes a second (`MAX_NOTES_PER_SECOND`, `src/engine/program.ts`): faster, `step=1000000`, is an error, and the player keeps the last piece that compiled. A rate left `free(…)` has its slider stop where the cap does, with a warning when its written range goes past it (`step=free(100bpm, 60..9999999)`). Cells at audio rate that start no notes (a voice's wave, a vibrato) aren't counted.

- **`stride=n`** — each step moves a stepped table n places (`stride=7`: fifths).
- **`cycle=n`** — how many before it comes round; see [tables.md](tables.md).
- Rates can be a **free** number: `step=free(90bpm, 60..240)`; see [free.md](free.md).

```cells
&bar scan(4 4 4 4) step=84bpm
&tune step=&bar*3/2 0 2 4
&fast step=&bar*2 0 1
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

A cell with **`law=`** has its notes computed by a law instead of written: `law=fiveto12` is the 5 to 12 cycle, a day of music (`src/engine/fiveto12.ts`). The law reads the day through **`over=&day`**: a day meter, a clock whose loop is a day, `&day scan(1!24) loop=1d`. **`anchor=hh.mm`** on that clock is the time of day it stands at when play starts (`anchor=11.55`); written on the law itself, it is a warning that says where it goes. Drawn **`show=sun`** (a built-in plugin: [plugins.md](plugins.md)), the day meter is a 24-hour dial, noon at the top. Rates take time units: `min` `h` `d` `wk` (`loop=1d` is one lap a day). See the example *5 to 12*.

## Laps and selectors

- **`laps=n`** — a clock plays n laps, then nothing it drives sounds: a piece that ends. The transport stops at the end.

```cells-fragment
&bar scan(27 23 26 24) step=free(66bpm, 40..96) laps=30   # thirty bars, then it ends
```

- **A selector** switches the taps of a meter's bus: an arrangement ([decision 016](../decisions/016-arranging-at-the-input.md)). A stepped table of names (`&parts step=&bar &verse &chorus`) declares them as its **taps**, each stepped as the table is; a part's cells are stepped by its tap (`step=&verse*2`); the selector reads the table (`over=&parts`) and steps through it, a section per step, each entry naming the taps that are on (a chord of numbers turns several on together). What a tap steps plays while it is on, from its top each time it is turned on; the rest stands still. A tap steps only what is stepped or looped from it: a drone on a clock of its own plays on. Two selectors reading one table AND together: a tap is on only while every one of them has it on (`&song` the form, `&mute` a second selector over the same `&parts`, a tap plays where both pick it). The parts' sound goes straight to the sound card. Pop song and 8-bit: Korobeiniki are arranged this way.

```cells
&bar scan(1 1 1 1) step=100bpm
&lead s=saw loop=C4
&bass s=saw loop=C2
&parts step=&bar &tuneBar &bassBar
&tune step=&tuneBar 0 2 4 5
&roots step=&bassBar 0
&song over=&parts step=&bar/4 laps=1 [1] [0,1] [0,1]
&out loop=SAMPLE_RATE map=sample [&tune * &lead * .3, &roots * &bass * .5]
```

A tap may have a line of its own with attributes only, and stays a tap (`&tuneBar off` switches the tune's part off in every section; holding its bulb in the graph writes that line). A name the table declares must step something (`step=&tuneBar`), or the compiler says so, and so does a table of taps no selector reads (every part would play all the time); a table of names none of which steps anything is a braid of cells as before (an unknown name an error). The old form, a selector reading a table of mixes and their sound through it, is an error now, and the error says what to write instead.

**`restart=`** names what switching a part on does to its time ([decision 032](../decisions/032-restart-policies.md)), on a tap's line (`&tuneBar restart=restart`) or on the selector, for all its taps: **`restart`**, from its top (the default, what plays today); **`resume`**, its time paused while it is off, going on where it stopped; **`free`**, its time running on global time and only its sound switched (Strudel's default). `resume` and `free` are named but not yet built: they warn and play as `restart`.

The transport marks a selector's sections and jumps to them ([../ui/transport.md](../ui/transport.md)). Selectors reading in a voice's or a melody's position are not built ([../limits.md](../limits.md)).
