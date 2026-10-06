# Display and description

How a cell is shown and described: names, labels, notes, the piece's card, `show=`, `size=`, scopes and the sound card's `level=`. None of it changes how a piece sounds.

## Names and notes

- **label="text"** a name shown instead of `&name`. **title="…"** and **tags="a, b"** take quoted text too; each may be given once per cell.
- **tags=** on a cell clusters it in the graph, the first tag grouping it; a tag is also a chip in the library.
- **A note**: a cell with a `label=` or `title=` and nothing else (no braid, `step=`, `over=`, `map=`, `shift=`, `off`, sound parameters). It does nothing; it explains. It floats at the top, beside the sound card, and is never clustered.
- **about=&cell** (or **about=(&a &b)**) on a note links it to the cells it explains: a fine dotted line from the note to each. The links are annotation only: they don't change the layout's rows or count as crossings, and a cell that is not a note can't have them. Keep a piece's card to one sentence and put the how-to-listen details in notes next to the cells they are about.

Label templates fill from the cell as it is now, so a key that turns renames itself: `{notes}` (up to 16, then …), `{tonic}`, `{mode}`, `{steps}`, `{tempo}` (beats a minute), `{shift}`, `{name}`, and `{&key:tonic}` for another cell's field (a note has none of its own). `**bold**`, `*italic*`, `\n` a new line; other text is escaped and unknown fields stay as written.

```cells
&piece title="Swing blues" tags="genre:jazz, genre:blues, rhythm" label="A **12-bar** blues sketch.\nSwung, in C."
&bar scan(1 1 1 1) step=100bpm
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}: {notes}"
&hint label="The major scale: 2 2 1 2 2 2 1." about=&major
&tune over=&major step=&bar/2 show=notes:flats size=1.5 label="the tune" 0 2 4 5
&v s=sine loop=C4
&out level=-6 loop=SAMPLE_RATE map=sample [&tune * &v * .3]
```

## A piece's card

The first cell with `title=` is the piece's card: its title names the piece (and the saved file), its `label=` is the description (fields dropped, formatting stripped, `\n` a space; an opening that repeats the title is cut), its `tags=` the piece's (split on commas, each once whatever the case). The picker shows each piece as one wheel: its graph inside, tags round the rim.

**Tags have kinds**, told apart by a prefix: `genre:jazz` (a style), `artist:Bach` (whose music it is after or about), and a tag without one is a **topic** (a technique or an idea: `rhythm`, `canon`, `tuning`). The library shows the name only and groups by kind; the five main genres (`genre:classical`, `genre:jazz`, `genre:electronic`, `genre:experimental`, `genre:world`) are the rim of its wheel. A piece saved before the prefixes keeps working: a bare `jazz` or `Bach` is read as `genre:jazz` and `artist:Bach`, and any other bare tag is a topic. The examples use only the tags of `VOCABULARY` in `src/engine/tags.ts` (a test fails on any other): to add a tag, add it there. (A cell's own `tags=` inside a piece are clusters, not kinds.)

## show=

**show=name** says how a cell is drawn. It is the default for everything below the cell (its parts, `&refs`, its tables), wherever it fits; `step=` drivers are not below. An unfit show is ignored. `petal` and `off` belong to the cell alone.

| kind | shows (first is plain) |
|---|---|
| voice | `spectrum` `wave` (one cycle) `petal` `off` |
| braid | `braid` `pattern` `notes` `midi` `do` `degrees` `petal` `off` |
| table | `table` `scale` `mode` `key` + the note shows |
| meter | `meter` `pattern` · grid: `grid` `table` · envelope: `adsr` `table` |
| volume | `levels` (bars) `braid` `pattern` · oscillation: `lfo` `levels` `braid` |
| selector | `matrix` (a ring per part, a pin where it plays) `braid` `pattern` |

Without `show=` it is inferred (a table of 12 is a `key`, a recognised mode a `scale`). **Conventions**: `notes:flats` `notes:sharps` `notes:german`, `do:fixed` `do:movable`. `petal` hangs a small cell from the one that uses it; `off` hides it from the graph (`off` alone also silences it).

## size=

**size=n** draws a cell `n` times as large against the others (`.25` to `4`, default 1): `&bar size=2`.

## Scopes

**scope=** makes a cell a screen; its braid lists its channels, `&a &b`. `stack` overlays, `split` a band each, `xy` draws the first against the second (a Lissajous figure). A sound shows its waveform; a stepped or gliding cell its value over the last two seconds. `spectrum` and `waterfall` show frequency: **fold=n** pitches folded by stride (12, by pitch class, default), **bins=n** that many bands without a fold, **channels=sum|split**.

```cells
&bar scan(1 1 1 1) step=60bpm
&strike step=&bar*6 0
&tonic body=fork loop=A3 ring=7 board=none 0
&fifth body=fork loop=A3 ring=7 board=none 7
&screen scope=xy label="x: the tonic · y: its fifth" &tonic &fifth
&out loop=SAMPLE_RATE map=sample [&strike * &tonic * .5] [&strike * &fifth * .5]
```

## Sentences

The detail sheet describes a cell in one sentence with its cells as links ("Plays 20 steps through &scale, stepped by &bar, on &lead."), then its connections by relation: reads, stepped by, made of, plays on, played by, shaped by, goes to, picks, moves, steps, used by.

## level=

**level=dB** on the sound card sets the overall level (0 as it is, −6 about half). Examples carry it from a loudness check (the convention: about −24 dB average, the median of the library, and a peak under −1 dB; a piece that can't have both, like a crushed big beat, keeps the peak): render to WAV (it reports the average and peak), or in the console `await cellStudio.measure(seconds?)` returns `{rms, peak, clipped}` in dB below full scale. Gains belong to the mix: [mix.md](mix.md).

## Limits

- A note cannot point at the cell it explains.
- Tag clusters overlap in the largest pieces.
- A restarted part's playhead shows the global clock, not its own ([braid.md](braid.md)).
- Physical cells draw as turntables: [physics.md](physics.md). See [../limits.md](../limits.md).
