# Time

What moves a cell: `step=` and `loop=`, the chains that scale them, `stride=`, meters and their taps, laps and selectors.

## step= and loop=

`step` counts single steps, `loop` whole turns of the braid (a k-step braid: `loop=r` is `step=r·k`):

|          | rate (`1`, `84bpm`, `440hz`) | `&x`               | `cycle(&x)`            | a tap (`pulse`, `beat`, `16n`, `1m`) |
|----------|------------------------------|--------------------|------------------------|--------------------------------------|
| `step=`  | one step per second          | one per step of &x | one per cycle of &x    | one per pulse, beat or note value of the meter ([taps](#taps)) |
| `loop=`  | whole braid per second       | whole braid per step of &x | whole braid per cycle of &x | |

Driven forms and taps take a chain of `*n` (n per one: faster) and `/n` (one per n: slower), read left to right, n any positive number: `step=&x*4` is four steps per step of `&x`, `&x/2` one per two, `&x*3/2` triplets — three steps per two; `step=pulse*2` two a pulse, `step=1m/4` one every four bars. The signs mean what they mean on a step (`x*n`, a ratchet) and in Strudel (`fast`, `slow`). On a parameter that takes a time from a clock (`delaytime=`, a tape's `length=`, a head's `at=`), the time is one step of the clock so made: `delaytime=&bar*2` is half a step of `&bar`, `length=&bar/4` four steps (a parameter doesn't take a tap yet).

A played cell starts at most 2,000 notes a second (`MAX_NOTES_PER_SECOND`, `src/engine/program.ts`): faster, `step=1000000`, is an error, and the player keeps the last piece that compiled. A rate left `free(…)` has its slider stop where the cap does, with a warning when its written range goes past it (`step=free(100bpm, 60..9999999)`). Cells at audio rate that start no notes (a voice's wave, a vibrato) aren't counted.

- **`stride=n`** — each step moves a stepped table n places (`stride=7`: fifths).
- **`cycle=n`** — how many before it comes round; see [tables.md](tables.md). On a tap, how many bars it runs before it comes round.
- Rates can be a **free** number: `step=free(90bpm, 60..240)`; see [free.md](free.md).

```cells
&bar scan(4 4 4 4) step=84bpm
&tune step=4t 0 2 4
&fast step=8n 0 1
```

## Meters

A meter is a cell whose braid is a `scan` or a `meter(…)`: `scan(27 23 26 24)` is a bent 4/4 bar, `scan(3 3 2)` the tresillo. A scan places its steps within the bar; other clocks step evenly, unless a swing leans them.

**`meter(signature, steps a pulse)`** writes a bar as levels, one per step: 0 the downbeat, 1 a beat, then finer subdivisions. `meter("4/4", 2)` is eight steps, `*.+.+.+.`; `meter("6/8")` six; levels can be written directly, `meter("*.+.+..")`. Read through a kit, each level picks its own sound (the Metronome).

A meter knows four things ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md)):

| | What it is | 3/4 | 4/4 | 6/8 | 9/8 | 12/8 | 7/8 |
|---|---|---|---|---|---|---|---|
| **bar** | its lap | 3 quarters | 4 quarters | 6 eighths | 9 eighths | 12 eighths | 7 eighths |
| **pulse** | the numerator: equal steps of the denominator's length | 3 | 4 | 6 | 9 | 12 | 7 |
| **beat** | what is counted, what `bpm` counts | 3 | 4 | 2 | 3 | 4 | 3, unequal (3+2+2) |
| **the tree** | its groups and their proportions | | | 3+3 | 3+3+3 | 3+3+3+3 | 3+2+2 |

A `scan(…)` has as many pulses as entries, each a quarter, and its beats are its entries. **`pulse=`** says another note value for its entries: `scan(1!432 .72!96 …) pulse=16n` is a tempo map in sixteenths, its beats quarters (four entries each, the last cut where the scan ends) and its bpm counting them, as BWV 847's; its taps read note values by it (`16n` an entry, `4n` four). A meter written as levels counts its steps as pulses (eighths; quarters when every step is a beat, sixteenths when every beat is four), its beats from each `+` to the next.

- **bpm counts beats**: `meter("6/8") step=60bpm` is two dotted quarters a second, a bar of 2 s. With unequal beats the bar lasts beats ÷ bpm and the beats keep their proportions: `meter("7/8") step=90bpm` is a bar of 2 s, beats of 0.86, 0.57 and 0.57 s.
- **`beat=n`** — another feel: n equal beats over the pulses (`meter("4/4") beat=2`, alla breve: its bpm counts half notes). On a cell that is not a meter it does nothing (a warning).
- **`swing=8n:r`** — swing on the bar ([#18](https://github.com/yggi/cells/issues/18)): one level of the meter leans, named by its note value. Of each pair of eighths, the second starts r of the way through their beat (.5 straight, .67 a triplet swing, .6 a light one); a share is a decimal or a fraction, `swing=8n:2/3` the exact triplet swing and `swing=16n:31/60` ([decision 042](https://github.com/yggi/cells/blob/main/docs/decisions/042-swing-share-as-a-fraction.md)); `swing=16n:.55` leans the sixteenths and leaves the eighths straight. A group of three (6/8's beat, 7/8's first) leans its second and third (or stays straight, with `:pairs` below): the second moves as far as a pair's would, from a third (at .67 to a half: long, short, short), the third halfway between it and the end.
  - **`:pairs`** leans a level's pairs alone and keeps its groups of three straight ([decision 053](https://github.com/yggi/cells/blob/main/docs/decisions/053-the-pairs-alone.md)): `meter("7/8") swing=8n:2/3:pairs` swings the eighths of each two-eighth beat and plays the first beat's three evenly, as a band swinging a mixed meter (5/8, 7/8, 10/8) does in jazz, and as Jambot's band does (its T16). It is a word on one level (`swing=8n:2/3:pairs,16n:.55` leans the sixteenths in every group). Where every group of the level is three (6/8's eighths), it leans nothing, with a warning.
  - **Every node keeps its ends**: a beat, a group's start and a bar line never move, so an odd bar never drifts. Swing never changes a meter's pulse or beat, so it never changes what a tap counts, only where its steps fall; a level no beat divides into (`swing=4n:.67` in 4/4, its quarters the beats) leans nothing, with a warning.
  - **Taps are placed through it**, whatever the meter's own steps: `meter("4/4") swing=8n:.67` swings `step=8n` and `step=pulse*2` alike. A division the tree holds is even within its node (16ths under swung eighths: the second at a third of a long eighth); one it doesn't hold is even within its beat, not warped (`8t` under swung eighths stays straight).
  - **So are the parts of a step** ([#121](https://github.com/yggi/cells/issues/121)): `step=4n [0 0]` under `swing=8n:.67` plays its second eighth where `step=8n` does, and `step=1m &rim(7,16,0)` under `swing=16n:.6` its strokes where `step=16n` does.
  - It swings a `meter(…)` and a `scan(…)` alike: a scan's taps lean within its bent beats.
  - **A note's level is read where it is written**, before the swing ([#287](https://github.com/yggi/cells/issues/287)): a level line that multiplies a line (`[&euclid * &euclidLevel]`) gives each note the level of its step as written, as Strudel's `.gain("…")` is read at a hit's place in the cycle. So a line times a level line on another grid gives each note its own step's level, whatever the swing does to either.
  - **Several levels** nest, coarse to fine, each node keeping its ends: `swing=8n:.6,16n:.55`. One level alone can be left free: `swing=8n:free(.5, .5..75)`.
  - **Bare, `swing=r`**: on a list stepping at a rate (no bar), of each pair of its steps the second starts r of the way through the pair. On a meter it leans the level of the meter cell's own steps (`meter("4/4", 2) swing=.67` is `swing=8n:.67`), with a warning that names the level, since the level of a cell's own steps changes with its subdivision; Shorten writes it so.

- **`legato=16n:.5`** — the meter's articulation ([#94](https://github.com/yggi/cells/issues/94)), a share of each note's written length by level (its steps, the end swung as the onset is: [sound.md](sound.md)), as swing names its levels: a line that taps the meter and states no `legato=` of its own sounds its notes at the share of its tap's level, the finest level at or above its step (`legato=16n:.5,4n:.8`: `step=16n` and `step=32n` at .5, `step=8n`, `step=pulse` and `step=beat` at .8 in 4/4, `step=2n` as written). An unequal beat (7/8's) is read by its longest. A line's own `legato=` wins ([sound.md](sound.md)); a line at a rate, or stepped by another cell, is as written. With swing, a meter fragment carries a feel: where its notes fall and how long they sound. One level alone can be left free: `legato=16n:free(.5, .25..1)`.

```cells
&bar meter("4/4") step=100bpm swing=8n:.6
&eighths step=8n 0
&tick s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&eighths * &tick]
```

The pairs alone, in 7/8: the eighths of the first beat even, those of the second and third swung.

```cells
&bar meter("7/8") step=90bpm swing=8n:2/3:pairs
&eighths step=8n 0
&tick s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&eighths * &tick]
```

## Taps

A line taps a meter by pulse, beat or note value, never by the meter cell's own steps ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md)), so changing the meter (4/4 to 3/4) or its swing doesn't change what a line means:

- **`step=pulse`**, **`step=pulse*k`** — each pulse, or each in k equal steps: in 7/8, `pulse` is seven equal eighths, `pulse*2` fourteen sixteenths.
- **`step=beat`**, **`step=beat*k`** — each beat, or each in k equal steps: in 7/8, `beat` is a dotted quarter and two quarters, `beat*3` three eighths and two triplets.
- **Note values**: `1n` `2n` `4n` `8n` `16n` `32n`, triplets `4t` `8t` `16t`, dotted `2n.` `4n.` `8n.`, and the bar, `1m`.
- **A tap comes round at the bar**: a note value longer than what is left of the bar is cut at the bar line. `1n` in 3/4 is one step a bar, a bar long; `4n.` in 4/4 is 3+3+2 eighths, the tresillo. **`cycle=n`** on the tap runs it n bars before it comes round: `step=1n cycle=4` in 3/4 is three whole notes over four bars.
- A tap reads the piece's **main meter**, the first meter in the text with a tempo of its own; another is named: `step=&bar2:16n`, `step=&swing:pulse`. A line reads the piece's **main key** the same way, `over=key` ([tables.md](tables.md)).
- A time parameter (`delaytime=`, a tape's `length=`, a head's `at=`) reads a tap as a length: `delaytime=8n` is an eighth at the meter's tempo (.25 s at 120 bpm), `4n.` is .75 s even where the bar line cuts it, `&bar2:8n` reads another meter. A pulse, a beat or the bar is the mean of its steps over the bar (`beat` in 7/8 as 3+2+2 at 90 bpm is 2/3 s: a parameter is one number). Like a clock's, it is fixed at the piece's tempo when compiled, and a swing leaves it as it is.
- The meter places the tap's steps: a scan bends them, `swing=` leans them (each node keeping its ends), a motor drags them. A part of a step (a subsequence's steps, a Euclid's strokes, a note's end under `legato=`) is placed from where it is written through the swing, even between the points of the finest level the swing leans, so it lands where a tap of that level does: `&euclid step=1m &rim(7,16,0)` under `swing=16n:.6` strikes where `step=16n` does ([#121](https://github.com/yggi/cells/issues/121)). On a tap the swing doesn't place so (`8t` under swung eighths), its parts are even within its step.

A line stepped by the meter cell's own steps (`step=&bar*2`) still plays as it did, with a warning that names the tap saying the same (`step=8n`); Shorten rewrites it so, where the notes stay the same.

```cells
&bar meter("7/8") step=90bpm
&count step=beat 0 3 5
&eighths step=8n 0!7
&tresillo step=4n. cycle=2 0 0 0 0 0
&click s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&count * &click, &eighths * &click * .3, &tresillo * &click * .5]
```

## Laws

A cell with **`law=`** has its notes computed by a law instead of written: `law=fiveto12` is the 5 to 12 cycle, a day of music (`src/engine/fiveto12.ts`). The law reads the day through **`over=&day`**: a day meter, a clock whose loop is a day, `&day scan(1!24) loop=1d`. **`anchor=hh.mm`** on that clock is the time of day it stands at when play starts (`anchor=11.55`); written on the law itself, it is a warning that says where it goes. Drawn **`show=sun`** (a built-in plugin: [plugins.md](plugins.md)), the day meter is a 24-hour dial, noon at the top. Rates take time units: `min` `h` `d` `wk` (`loop=1d` is one lap a day). See the example *5 to 12*.

## Laps and selectors

**Three words, three things** ([decision 044](https://github.com/yggi/cells/blob/main/docs/decisions/044-tap-reads-the-meter.md)). A **tap** reads a meter by pulse, beat or note value (`step=beat`, `step=16n`: [decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md); `src/engine/compiler/clocks.ts` and `src/engine/clocking.ts`). A **section** is a name in a selector's table that steps a part's cells ([decision 016](https://github.com/yggi/cells/blob/main/docs/decisions/016-arranging-at-the-input.md), `src/engine/compiler/sections.ts`). A **reader** reads a net: a canon's copy, a tape's head ([decision 010](https://github.com/yggi/cells/blob/main/docs/decisions/010-canon-copies.md)); a pick is a fixed reader on a turning cell ([braid.md](braid.md)).

- **`laps=n`** — a clock plays n laps, then nothing it drives sounds: a piece that ends. The transport stops at the end.

```cells-fragment
&bar scan(27 23 26 24) step=free(66bpm, 40..96) laps=30   # thirty bars, then it ends
```

- **A selector** switches sections: an arrangement ([decision 016](https://github.com/yggi/cells/blob/main/docs/decisions/016-arranging-at-the-input.md)). A stepped table of names (`&sections step=4n &verse &chorus`) declares them as its **sections**, each stepped as the table is; a part's cells are stepped by its section (`step=&verse*2`); the selector reads the table (`over=&sections`) and steps through it, each of its steps naming the sections that are on (a chord of numbers turns several on together). What a section steps plays while it is on, from its top each time it is turned on; the rest stands still. A section steps only what is stepped or looped from it: a drone on a clock of its own plays on. Two selectors reading one table AND together: a section is on only while every one of them has it on (`&song` the form, `&mute` a second selector over the same `&sections`, a section plays where both pick it). The parts' sound goes straight to the sound card. Pop song and 8-bit: Korobeiniki are arranged this way; [BWV 847](../../examples/bwv847.md) the other way round, its table the five voices and its selector's steps the piece's sections, each step naming the voices that play (`[0,1]@384 1@48 …`), with `restart=resume`.

```cells
&bar scan(1 1 1 1) step=100bpm
&lead s=saw loop=C4
&bass s=saw loop=C2
&sections step=4n &tuneBar &bassBar
&tune step=&tuneBar 0 2 4 5
&roots step=&bassBar 0
&song over=&sections step=1m laps=1 [1] [0,1] [0,1]
&out loop=SAMPLE_RATE map=sample [&tune * &lead * .3, &roots * &bass * .5]
```

A section may have a line of its own with attributes only, and stays a section (`&tuneBar off` switches the tune's part off in every step of the song; holding its bulb in the graph writes that line). A name the table declares must step something (`step=&tuneBar`), or the compiler says so, and so does a table of sections no selector reads (every part would play all the time); a table of names none of which steps anything is a braid of cells as before (an unknown name an error). The old form, a selector reading a table of mixes and their sound through it, is an error now, and the error says what to write instead.

**`restart=`** names what switching a part on does to its time ([decision 032](https://github.com/yggi/cells/blob/main/docs/decisions/032-restart-policies.md)), on a section's line (`&tuneBar restart=resume`) or on the selector, for all its sections (a section's own line wins): **`restart`**, from its top each time (the default); **`resume`**, its time paused while it is off, going on where it stopped; **`free`**, its time running on as if never switched, only its sound gated (Strudel's default), so it lands where an unswitched copy would be. With several selectors on one part, the first that names a policy other than `restart` rules. A part the selector's next step names again stays on: under `resume` and `free` its notes go on through the step, a note held across it held whole; under `restart` it starts again from its top, as each step that names it switches it on. [In C, a sketch](../../examples/in-c.md) needs `resume`: each player repeats a cell until moving on, and one who sits out comes back where they left off.

```cells
&bar meter("4/4") step=120bpm
&major scale(major)
&sections step=4n &mel
&mel restart=resume
&song over=&sections step=4n laps=1 0@2 ~@2 0@3 ~ 0 ~
&tune over=&major step=&mel 0 1 2 3 4 5 6 7 8 9 10 11
&lead s=sine loop=C4
&out map=sample [&tune * &lead]
```

The transport marks a selector's steps and jumps to them ([../ui/transport.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/transport.md)). Selectors reading in a voice's or a melody's position are not built ([../limits.md](https://github.com/yggi/cell-studio/blob/main/docs/limits.md)).
