# Time

What moves a cell: `step=` and `loop=`, the chains that scale them, `stride=`, meters and their taps, laps and selectors.
What a meter and a tempo are, beside the key and the tonic, and how they line up: [foundations.md](foundations.md); this page is their reference.

## step= and loop=

`step` counts single steps, each a note; `loop` whole turns of the braid, read as a signal ([decision 068](https://github.com/yggi/cells/blob/main/docs/decisions/068-the-core-grammar.md): dilate, then a held ramp). A k-step braid with `loop=r` moves at the rate of `step=r·k`, but starts no note at each step: each value is held as a bend, a waveform or a voice's frequency (a voice played alone, `&a loop=A4`, sounds as one held note). So `&vib loop=5 0 .1 -.1` in `[(&theme + &vib) * &lead]` bends the theme every 1/15 s, where `&vib step=15 0 .1 -.1` there would play 15 notes a second.

|          | rate (`1`, `84bpm`, `440hz`) | `&x`               | `cycle(&x)`            | a tap (`pulse`, `beat`, `16n`, `1m`) |
|----------|------------------------------|--------------------|------------------------|--------------------------------------|
| `step=`  | one step per second          | one per step of &x | one per cycle of &x    | one per pulse, beat or note value of the meter ([taps](#taps)) |
| `loop=`  | whole braid per second       | whole braid per step of &x | whole braid per cycle of &x | |

Driven forms and taps take a chain of `*n` (n per one: faster) and `/n` (one per n: slower), read left to right, n any positive number: `step=&x*4` is four steps per step of `&x`, `&x/2` one per two, `&x*3/2` triplets — three steps per two; `step=pulse*2` two a pulse, `step=1m/4` one every four bars. The signs mean what they mean on a step (`x*n`, a ratchet) and in Strudel (`fast`, `slow`). On a parameter that takes a time from a clock (`delaytime=`, a tape's `length=`, a head's `at=`), the time is one step of the clock so made: `delaytime=&bar*2` is half a step of `&bar`, `length=&bar/4` four steps. It reads a tap too, as a length (`delaytime=8n`, below).

A played cell starts at most 2,000 notes a second (`MAX_NOTES_PER_SECOND`, `src/engine/program.ts`): faster, `step=1000000`, is an error, and the player keeps the last piece that compiled. A rate left `free(…)` has its slider stop where the cap does, with a warning when its written range goes past it (`step=free(100bpm, 60..9999999)`). Cells at audio rate that start no notes (a voice's wave, a vibrato) aren't counted.

- **`stride=n`** — each step moves a stepped table n places (`stride=7`: fifths).
- **`cycle=n`** — how many laps before it comes round ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md), #75): a table's own length, an index read through it, or, on a tap, its bars; `cycle=0` holds the first entry. See [tables.md](tables.md). A line on a tap walks its own braid across the bar line, as a melody does; with `cycle=n` it comes round every n bars, its steps past them dropped and a shorter braid repeated up to them (#116): `&kick note=36 step=16n cycle=1` with 16 sixteenths plays 14 of them in a bar of 7/8, and begins again.
- Rates can be a **free** number: `step=free(90bpm, 60..240)`; see [free.md](free.md). Moved while it plays, the piece goes on with its beat kept ([#56](https://github.com/yggi/cells/issues/56)).

```cells
&bar meter("4/4") step=&tempo
&tempo step=84bpm
&tune step=4t 0 2 4
&fast step=8n 0 1
```

## Meters

A meter is a cell whose braid is a `scan` or a `meter(…)`: `scan(27 23 26 24)` is a bent 4/4 bar, `scan(3 3 2)` the tresillo. A scan places its steps within the bar; other clocks step evenly, unless a swing leans them.

**`meter(signature, step)`** writes a bar as levels, one per step. **A meter is two applications of `even`** ([decision 072](https://github.com/yggi/cells/blob/main/docs/decisions/072-even-is-the-foundation.md), [#506](https://github.com/yggi/cells/issues/506), yggi/music-commons `contracts/meter` v2):
- **Its pulses into beats, by its signature:**
  - **x/8** (and x/16) is the canonical even set of ⌈x/3⌉ groups, the fewest 2s and 3s as evenly as they go: `3/8` one beat, `5/8` 3+2, `7/8` 3+2+2, `8/8` 3+3+2, `10/8` 3+2+3+2, `11/8` 3+3+3+2, `13/8` 3+3+2+3+2.
  - **x/4 and x/2** count beats of the denominator (`2/2` two halves, `3/2` three, `7/4` seven quarters), or threes where x is a multiple of 3 from 6 (`6/4` two dotted halves, against `3/2`'s three halves).
- **Its beats into halves:** two or three groups each start a beat (`+`); four or more are halved by `even(2, count)` (5/4 as 3+2, 7/4 as 4+3), each half again, a tier for each halving: the second half's first is `+`, the others a tier below. So `meter("4/4", 2)` is eight steps, `*.-.+.-.`, and `meter("6/8")` six, `*..+..`.

**Its tiers** run from the bar to the step, and **its grades are its tiers mapped from the ends**:
- `*` is the bar, `,` the step and `.` the eighth;
- the tiers between take `+ - : ;` from the top. A group of 4 or 6 eighths holds pairs a tier below its start: `meter("4/2", 2)` is `*:-:+:-:`, and 2/2 grades as 4/4.
- **The numbers it writes are its tiers from the ends into five:** 0 the bar, 1 a beat, 2 any tier between, 3 the eighth, 4 finer. Read through a kit, each picks its own sound (the Metronome's five clicks, in any meter: in 4/4 its second and fourth beats click a half's beat).

**The step:**
- a number of steps a pulse (`meter("6/8", 2)`);
- or a note value (`meter("6/8", 16n)`, the same meter).

**Groups as sizes:** `meter("2+2+3")` writes eighths in groups of 2 and 3, each 2, 3, 4 or 6, and `meter("2+2+3/4")` quarters. A signature is a name for one grouping (`meter("7/8")` is `meter("3+2+2")`, the same meter). Its beats are its groups, and its bpm counts them.

**Levels can be written directly**, `meter("*.+.+..")`, every mark but `.` and `,` starting a beat: `meter("*.-.+.-.")` is 4/4. Their step's note value is their pulse: alla breve is `meter("*,.,+,.,", 8n)`, a waltz in one `meter("*..", 4n)`.
The levels are the tree's ([contracts/meter](https://github.com/yggi/music-commons/blob/main/contracts/meter/README.md)'s grades) and the beats are read off them, which is the tree's beat wherever the tier above the eighth is a beat's: every x/8 meter, and x/4 and x/2 in their own beats. Where a tier sits between the beat and the eighth, the quarters of a compound x/4 (6/4, 9/4, 12/4: `*--+--`) and the quarters of x/2 at 2 steps a beat, each `-` written would start a beat, so such a meter is written by its signature, `meter("6/4")`, and the core keeps it so ([#545](https://github.com/yggi/cells/issues/545)).
- Written out at a step a pulse, every signature from 2/8 to 16/8, 2/4 to 7/4 and 2/2 to 4/2 is the same meter again.
- One whose quarters sit inside its beats (6/4, or 2/2 in quarters) reads those quarters as beats, and is written by its signature or sizes.

**A meter's tempo read from a cell** ([#290](https://github.com/yggi/cells/issues/290)): `&bar meter("4/4") step=&tempo` with `&tempo step=104bpm`, a cell that is a rate alone (no braid), keeps time as `&bar meter("4/4") step=104bpm` does, its swing and its beats as written, so it is the piece's main meter and its taps read it; `step=&tempo*2` doubles it. A fragment that leaves its tempo to the text that uses it reads it so, a hole like a name (the seed meters do). A meter stepped by any other cell steps by that cell's steps, as before.

A meter knows four things ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md)):

| | What it is | 3/4 | 4/4 | 6/8 | 9/8 | 12/8 | 7/8 |
|---|---|---|---|---|---|---|---|
| **bar** | its lap | 3 quarters | 4 quarters | 6 eighths | 9 eighths | 12 eighths | 7 eighths |
| **pulse** | the numerator: equal steps of the denominator's length | 3 | 4 | 6 | 9 | 12 | 7 |
| **beat** | what is counted, what `bpm` counts | 3 | 4 | 2 | 3 | 4 | 3, unequal (3+2+2) |
| **the tree** | its groups and their proportions | | | 3+3 | 3+3+3 | 3+3+3+3 | 3+2+2 |

A `scan(…)` has as many pulses as entries, each a quarter, and its beats are its entries. **`pulse=`** says another note value for its entries: `scan(1!432 .72!96 …) pulse=16n` is a tempo map in sixteenths, its beats quarters (four entries each, the last cut where the scan ends) and its bpm counting them, as BWV 847's; its taps read note values by it (`16n` an entry, `4n` four). A meter written as levels counts its steps as pulses (eighths; quarters when every step is a beat, sixteenths when every beat is four), its beats from each `+` to the next.

- **bpm counts beats**: `meter("6/8") step=60bpm` is two dotted quarters a second, a bar of 2 s. With unequal beats the bar lasts beats ÷ bpm and the beats keep their proportions: `meter("7/8") step=90bpm` is a bar of 2 s, beats of 0.86, 0.57 and 0.57 s.
- **`beat=n`** is retired (#502): a meter counts its beats by its signature or its levels, so alla breve is `meter("2/2", 2)` (its bpm counts half notes) and a waltz in one `meter("*..", 4n)`. It is an error that says so, read only by a text read the old way (Migrate's and Normalise's reading, [#575](https://github.com/yggi/cells/issues/575)), and Migrate rewrites it.
- **`swing=8n:r`** — swing on the bar ([#18](https://github.com/yggi/cells/issues/18)): one level of the meter leans, named by its note value. Of each pair of eighths, the second starts r of the way through their beat (.5 straight, .67 a triplet swing, .6 a light one); a share is a decimal or a fraction, `swing=8n:2/3` the exact triplet swing and `swing=16n:31/60` ([decision 042](https://github.com/yggi/cells/blob/main/docs/decisions/042-swing-share-as-a-fraction.md)); `swing=16n:.55` leans the sixteenths and leaves the eighths straight.
  - **Pairs lean, a group of three stays straight** ([decision 071](https://github.com/yggi/cells/blob/main/docs/decisions/071-swing-leans-pairs.md)): `meter("7/8") swing=8n:2/3` swings the eighths of each two-eighth beat and plays the first beat's three evenly, as a band swinging a mixed meter (5/8, 7/8, 10/8) does in jazz, as Jambot's band does (its T16) and as the family's swing contract reads it. A finer level leans inside a three (`swing=8n:2/3,16n:.55` leans the sixteenths in every group). Where every group of the level is three (6/8's eighths), it leans nothing, with a warning. `:pairs` after a share (`swing=8n:2/3:pairs`, [decision 053](https://github.com/yggi/cells/blob/main/docs/decisions/053-the-pairs-alone.md)'s word) is read, and warns that it says nothing more ([#600](https://github.com/yggi/cells/issues/600)); Migrate drops it.
  - **Every node keeps its ends**: a beat, a group's start and a bar line never move, so an odd bar never drifts. Swing never changes a meter's pulse or beat, so it never changes what a tap counts, only where its steps fall; a level no beat divides into (`swing=4n:.67` in 4/4, its quarters the beats) leans nothing, with a warning.
  - **Taps are placed through it**, whatever the meter's own steps: `meter("4/4") swing=8n:.67` swings `step=8n` and `step=pulse*2` alike. **A division is even within the finest node of the tree its length divides** ([#15](https://github.com/yggi/cells/issues/15)): 16ths under swung eighths are even within each eighth (the second at a third of a long eighth); `8t` divides the beat and not the eighth, so its thirds are even in the beat (a triplet under swung eighths stays straight, its third on the swung eighth); `16t` divides the eighth, so its thirds are even within each swung eighth.
  - **So are the parts of a step** ([#121](https://github.com/yggi/cells/issues/121), #15), as the division they are: `step=4n [0 0]` under `swing=8n:.67` plays its second eighth where `step=8n` does, `step=4n [0 0 0]` its thirds where `step=8t` does, `step=8n [0 0 0]` where `step=16t` does, and `step=1m &rim(7,16,0)` under `swing=16n:.6` its strokes where `step=16n` does. So a subsequence is the chain on its tap under a swing too: `step=4n 0 [2 4 5]` is `step=4n*3 0@3 2 4 5`.
  - It swings a `meter(…)` and a `scan(…)` alike: a scan's taps lean within its bent beats.
- **`bend=4n:&table`** bends a level's nodes ([decision 080](https://github.com/yggi/cells/blob/main/docs/decisions/080-a-meter-is-a-tree-placed-through-a-time-map.md)): the nodes of the level named by note value take the table's numbers as their relative lengths, in turn, the bar as long as before. `&bar meter("*.-.+.-.") step=90bpm bend=4n:&rubato` with `&rubato 27 23 26 24` plays a bent 4/4, its eighths leaning within each beat and tapped by level.
  - A table longer than the bar spans bars, a tempo map: `bend=16n:&map` with `&map 1!432 .72!96 …` bends the sixteenths of as many bars as it holds.
  - **Its depth** ([decision 081](https://github.com/yggi/cells/blob/main/docs/decisions/081-swing-moved-at-the-bar-line.md)), after another colon: how far the table applies, its ratios raised to it. `bend=4n:&rubato:.5` is half the rubato, `:0` even, `:2` exaggerated, `:-1` inverted (the long beats short); with none it is 1, as written. It is the swing's partner, and moves as the swing's share does: `bend=4n:&rubato:&d` takes the cell's values as depths, `bend=4n:&rubato:0..1 * &k` puts a cell's 0..1 on a range, each read at the line of the table's span (the bar line, where the table fits a bar) and held through it.
  - A swing composes with it, finer within each bent node.
  - A meter `scan(…)` is its sugar: `scan(27 23 26 24) step=r` is `meter("++++") step=r bend=4n:&(27 23 26 24)`, every entry a beat.

  ```cells
  &bar meter("*.-.+.-.") step=90bpm bend=4n:&rubato
  &rubato 27 23 26 24
  &tune step=8n 0 2 4 5 7 5 4 2
  &v s=sine loop=C4
  &out map=sample [&tune * &v]
  ```
  - **A note's level is read where it is written**, before the swing ([#287](https://github.com/yggi/cells/issues/287)): a level line that multiplies a line (`[&euclid * &euclidLevel]`) gives each note the level of its step as written, as Strudel's `.gain("…")` is read at a hit's place in the cycle. So a line times a level line on another grid gives each note its own step's level, whatever the swing does to either.
  - **Read from a cell** ([#308](https://github.com/yggi/cells/issues/308)): `swing=&swing`, with `&swing swing=8n:2/3`, a cell that is a swing alone (no braid, no step, nothing but its `swing=`), swings the meter as the swing written on it would, in any of its forms (a fraction, `free(…)`, several levels), as `step=&tempo` reads a rate alone. So a fragment can leave its swing to the text that uses it, or give its own as a helper: the seed `meter` does, its `&swing` a parameter (`&bar from meter(swing=8n:2/3) &tempo`), and a text that swings otherwise passes its own (`&bar from meter(swing=&swing) &tempo`, `&swing swing=8n:free(.64, .5..0.75)`). Anything else read there is an error.
  - **Several levels** nest, coarse to fine, each node keeping its ends: `swing=8n:.6,16n:.55`. One level alone can be left free: `swing=8n:free(.5, .5..75)`.
  - **Moved by a cell** ([decision 081](https://github.com/yggi/cells/blob/main/docs/decisions/081-swing-moved-at-the-bar-line.md)), one level alone: `swing=8n:&lean` takes the cell's values as shares, and `swing=8n:.5...75 * &k` puts a cell's 0..1 on a range, its ends sliders or centre ± reach (decision 079). Each bar plays the share read at its bar line, held through the bar. The bar line is the one place no swing moves, so a cell the same meter steps can set it: `&lean step=1m .55 .67` leans every other bar further. A reader with no time (the meter's drawing) holds a range's first end, or the cell's first value. `swingOfBar(plan, meter, bar)` reads a bar's swing, for a host's frames.

```cells
&tempo step=120bpm
&bar meter("4/4") step=&tempo swing=8n:&lean
&lean step=1m .55 .67
&v s=tri loop=C4
&hat step=8n 0 0 0 0 0 0 0 0
&out map=sample [&hat * &v]
```

  - **Bare, `swing=r`**: on a list stepping at a rate (no bar), of each pair of its steps the second starts r of the way through the pair. On a meter it is retired, since the level of a cell's own steps changes with its subdivision: an error that names the level (`meter("4/4", 2) swing=.67` is `swing=8n:.67`), which Migrate writes (its rule `swing`; #15, rung 5). Where the meter's own steps are its beats, which swing never moves, it leans nothing and says so.

- **`legato=16n:.5`** — the meter's articulation ([#94](https://github.com/yggi/cells/issues/94)), a share of each note's written length by level (its steps, the end swung as the onset is: [sound.md](sound.md)), as swing names its levels: a line that taps the meter and states no `legato=` of its own sounds its notes at the share of its tap's level, the finest level at or above its step (`legato=16n:.5,4n:.8`: `step=16n` and `step=32n` at .5, `step=8n`, `step=pulse` and `step=beat` at .8 in 4/4, `step=2n` as written). An unequal beat (7/8's) is read by its longest. A line's own `legato=` wins ([sound.md](sound.md)); a line at a rate, or stepped by another cell, is as written. With swing, a meter fragment carries a feel: where its notes fall and how long they sound. One level alone can be left free: `legato=16n:free(.5, .25..1)`.

```cells
&bar meter("4/4") step=&tempo swing=8n:.6
&tempo step=100bpm
&eighths step=8n 0
&tick s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&eighths * &tick]
```

In 7/8: the eighths of the first beat even, those of the second and third swung.

```cells
&bar meter("7/8") step=&tempo swing=8n:2/3
&tempo step=90bpm
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
- A tap reads the piece's **main meter**: the meter with a tempo of its own, a rate or a tempo cell's, wherever it is written. A meter that taps another (`&clave scan(3 3 4 3 3) step=pulse*5/4`) keeps the first's time and is never the main one; it is named: `step=&clave:pulse`, `step=&swing:pulse`. Where a piece has several meters with a tempo of their own, none is the main one by its place in the text, and every tap names its meter, `step=&bar2:16n` ([decision 091](https://github.com/yggi/cells/blob/main/docs/decisions/091-a-tap-names-its-meter.md)): a bare tap there is an error that lists them.
- A time parameter (`delaytime=`, a tape's `length=`, a head's `at=`) reads a tap as a length: `delaytime=8n` is an eighth at the meter's tempo (.25 s at 120 bpm), `4n.` is .75 s even where the bar line cuts it, `&bar2:8n` reads another meter. A pulse, a beat or the bar is the mean of its steps over the bar (`beat` in 7/8 as 3+2+2 at 90 bpm is 2/3 s: a parameter is one number). Like a clock's, it is fixed at the piece's tempo when compiled, and a swing leaves it as it is.
- The meter places the tap's steps: a scan bends them, `swing=` leans them (each node keeping its ends), a motor drags them. A part of a step (a subsequence's steps, a Euclid's strokes) is placed from where it is written through the swing as the division it is, so it lands where a tap of that division does: `&euclid step=1m &rim(7,16,0)` under `swing=16n:.6` strikes where `step=16n` does ([#121](https://github.com/yggi/cells/issues/121)), `step=4n [0 0 0]` under swung eighths where `step=8t` does (#15). A note's end under `legato=` is placed so too where its division is one the swing doesn't hold (a triplet's), and otherwise continuously, even between the points of the finest level the swing leans. On a tap the swing doesn't place (`8t` under swung eighths), its parts are even within its step.

A line stepped by the meter cell's own steps (`step=&bar`, `step=&bar*2`) is retired: an error that names the tap saying the same (`step=8n`), which Migrate writes where the notes stay the same (its rule `tap`, dropping a `cycle=` that counted the meter's laps; #15, rung 5). Migrate and Normalise read such a text the old way, with a warning, to rewrite it.

```cells
&bar meter("7/8") step=&tempo
&tempo step=90bpm
&count step=beat 0 3 5
&eighths step=8n 0!7
&tresillo step=4n. cycle=2 0 0 0 0 0
&click s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&count * &click, &eighths * &click * .3, &tresillo * &click * .5]
```

## Laws

A **law** computes a cell's notes instead of writing them: `fiveto12` is the 5 to 12 cycle, a day of music (`src/engine/fiveto12.ts`), a plugin-fragment cells holds itself ([decision 085](https://github.com/yggi/cells/blob/main/docs/decisions/085-plugin-fragments.md)). A piece takes it from the clock it reads, its main argument: **`&cycle from five_to_twelve &day`**, where `&day` is a day meter, a clock whose loop is a day, `&day scan(1!24) loop=1d`. **`anchor=hh.mm`** on that clock is the time of day it stands at when play starts (`anchor=11.55`); written on the law's head, it is a warning that says where it goes. Its notes are read by the language: degrees over its key, its levels and places as cells ([plugins.md](plugins.md)). Drawn **`show=sun`** (a built-in plugin), the day meter is a 24-hour dial, noon at the top. Rates take time units: `min` `h` `d` `wk` (`loop=1d` is one lap a day). See the example *5 to 12*.

```cells
&day scan(1!24) loop=1d anchor=11.55 show=sun
&cycle from five_to_twelve &day
&glass s=tri loop=C4
&out map=sample [&cycle * &glass * .3]
```

The old spelling, `&cycle law=fiveto12 over=&day`, still reads, with a warning naming the `from` line; Migrate rewrites it.

## Laps and selectors

**Three words, three things** ([decision 044](https://github.com/yggi/cells/blob/main/docs/decisions/044-tap-reads-the-meter.md)). A **tap** reads a meter by pulse, beat or note value (`step=beat`, `step=16n`: [decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md); `src/engine/compiler/clocks.ts` and `src/engine/clocking.ts`). A **section** is a name in a selector's table that steps a part's cells ([decision 016](https://github.com/yggi/cells/blob/main/docs/decisions/016-arranging-at-the-input.md), `src/engine/compiler/sections.ts`). A **reader** reads a net: a canon's copy, a tape's head ([decision 010](https://github.com/yggi/cells/blob/main/docs/decisions/010-canon-copies.md)); a pick is a fixed reader on a turning cell ([braid.md](braid.md)).

- **`laps=n`** — a clock plays n laps, then nothing it drives sounds: a piece that ends. The transport stops at the end.

```cells-fragment
&bar scan(27 23 26 24) step=free(66bpm, 40..96) laps=30   # thirty bars, then it ends
```

- **A selector** switches sections: an arrangement ([decision 016](https://github.com/yggi/cells/blob/main/docs/decisions/016-arranging-at-the-input.md)). A stepped table of names (`&sections step=4n &verse &chorus`) declares them as its **sections**, each stepped as the table is; a part's cells are stepped by its section (`step=&verse*2`); the selector reads the table (`over=&sections`) and steps through it, each of its steps naming the sections that are on (a chord of numbers turns several on together). What a section steps plays while it is on, from its top each time it is turned on; the rest stands still. A section steps only what is stepped or looped from it: a drone on a clock of its own plays on. Two selectors reading one table AND together: a section is on only while every one of them has it on (`&song` the form, `&mute` a second selector over the same `&sections`, a section plays where both pick it). The parts' sound goes straight to the sound card. Pop song and 8-bit: Korobeiniki are arranged this way; [BWV 847](../../examples/bwv847.md) the other way round, its table the five voices and its selector's steps the piece's sections, each step naming the voices that play (`[0,1]@384 1@48 …`), with `restart=resume`.

```cells
&bar meter("4/4") step=&tempo
&tempo step=100bpm
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
&bar meter("4/4") step=&tempo
&tempo step=120bpm
&major scale(major)
&sections step=4n &mel
&mel restart=resume
&song over=&sections step=4n laps=1 0@2 ~@2 0@3 ~ 0 ~
&tune over=&major step=&mel 0 1 2 3 4 5 6 7 8 9 10 11
&lead s=sine loop=C4
&out map=sample [&tune * &lead]
```

- **A band** switches performers: who plays when ([decision 061](https://github.com/yggi/cells/blob/main/docs/decisions/061-the-band.md), `src/engine/compiler/band.ts`). A table whose entries are performers, gates or roles ([mix.md](mix.md)), is a band, a table as a kit is, with no step= of its own; a selector reading it steps through it, each of its steps naming the entries that play. A role stands for all its players, and a gate named itself is switched alone; a gate is one entry of a band. The selector switches their sound and leaves their time on the meter: their parts tap it as they did, so they swing, and a part a `from` line takes is arranged as it is taken, with no section to step it. So a performer's `restart=` is **`free`** unless one is written, as a player who sits out comes back in time; `restart` and `resume` work as on a section, on the selector or on a performer's own line, and warn where the selector switches off the bar (`step=1m` keeps each note's place in the bar). A part a section steps too keeps the section's `restart`: a band that keeps it on step after step changes nothing.

```cells
&bar meter("4/4") step=&tempo swing=8n:2/3
&tempo step=120bpm
&key scale(major, G)
&violinV s=saw loop=G4 env=&(map=adsr .05 .2 .7 .3)
&celloV s=saw loop=G2 env=&(map=adsr .05 .2 .7 .3)
&melody over=&key step=8n 0 2 4 5 4 2 0 ~
&harmony over=&key step=4n -3 0 -1 0
&violin play=&melody level=.6 &violinV
&violin2 play=&harmony^$-12 level=.4 &violinV
&cellist play=&harmony &celloV
&lead map=role &violin
&comp map=role &violin2 &cellist
&band &lead &comp
&form over=&band step=1m 1 [0,1]!3 ~ 0   # the comp alone, then all, then a bar's rest, then the lead
&out loop=SAMPLE_RATE map=sample [&violin, &violin2, &cellist]
```

The transport marks a selector's steps and jumps to them ([../ui/transport.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/transport.md)). Selectors reading in a voice's or a melody's position are not built ([../limits.md](https://github.com/yggi/cell-studio/blob/main/docs/limits.md)).
