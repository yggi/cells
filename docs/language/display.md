# Display and description

How a cell is shown and described: names, labels, notes, the piece's file and its card, `show=`, `size=`, scopes, and how loud an example is (the sound card's `postgain=`, from a loudness check). Apart from that last, none of it changes how a piece sounds.

## Names and notes

- **label="text"** a name shown instead of `&name`. **tags="a, b"** takes quoted text too; each may be given once per cell.
- **tags=** on a cell clusters it in the graph, the first tag grouping it; a tag is also a chip in the library.
- **A note**: a cell with a `label=` and nothing else (no braid, `step=`, `over=`, `map=`, `shift=`, `off`, sound parameters). It does nothing; it explains. It is read in the graph's margin, not among the cells, numbered in the order the piece writes notes, and is never clustered ([../ui/graph.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/graph.md): the margin).
- **about=&cell** (or **about=(&a &b)**) on a note links it to the cells it explains: each wears the note's number on its rim. The links are annotation only: they don't change the layout, and a cell that is not a note can't have them. Keep a piece's description to one sentence and put the how-to-listen details in notes next to the cells they are about.

Label templates fill from the cell as it is now, so a key that turns renames itself: `{notes}` (up to 16, then …), `{tonic}`, `{mode}` (bold, the common name first: **Minor** (*Aeolian*)), `{steps}`, `{tempo}` (beats a minute), `{shift}`, `{name}`, and `{&key:tonic}` for another cell's field (a note has none of its own). `**bold**`, `*italic*`, `\n` a new line; other text is escaped. Any other field (`{lap}`, a misspelt `{tempi}`) stays as written, with a warning that lists these.

```cells
&bar scan(1 1 1 1) step=100bpm
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}: {notes}"
&hint label="The major scale: 2 2 1 2 2 2 1." about=&major
&tuneNote label="A **12-bar** blues sketch.\nSwung, in C." about=&tune
&tune over=&major step=8n show=notes:flats size=1.5 label="the tune" 0 2 4 5
&v s=sine loop=C4
&out postgain=.501 loop=SAMPLE_RATE map=sample [&tune * &v * .3]
```

## A piece's file and its card

A piece is a file, the same kind as a fragment ([decision 047](../decisions/047-fragments-are-files.md)): Markdown, its YAML frontmatter first (the subset cells parses, `src/repository/yaml.ts`), then one ```` ```cells ```` block holding the piece, then prose, if any. Nothing comes before the block. The examples are such files (`examples/*.md`):

````markdown
---
title: Swing blues
tags: [genre:jazz, genre:blues, rhythm]
description: A blues riff, in C.
---

```cells
&bar scan(1 1 1 1) step=100bpm swing=8n:2/3
&riff step=8n 0 3 5 6 7 ~ 10 7
&v s=tri loop=C4
&out postgain=.501 map=sample [&riff * &v * .3]
```

Anything else about the piece, in prose.
````

The frontmatter says what the piece is: its `title` names it (and the saved file), its `tags` are the piece's (a list; each once, whatever the case), its `tier` its tier of the tutorial (below), its `description` what the piece is, in a sentence; any other key is kept, in its order. The text holds the piece and no card: Convert to cells writes its title, `tags: [midi]` and description in the frontmatter of `Imported`, as the examples have theirs. The picker shows each piece as one wheel: its graph inside, tags round the rim. `pieceMeta` reads the card (fields dropped, formatting stripped, `\n` a space; an opening that repeats the title is cut), `readPiece` and `writePiece` the file (`src/engine/piecefile.ts`).

**Written the old way**, a text says these on its card, the first note with a `title=`: `&piece title="Swing blues" tags="genre:jazz, rhythm" tier=1 label="…"`. It still compiles, and `pieceMeta` still reads its card, with a warning on the card that its `title=`, `tags=` and `tier=` go in the file's frontmatter now. A file written before the description moved to the frontmatter keeps its card in its text, the note `&piece label="…"`; it is still valid, and `pieceMeta` reads its label as the description where the frontmatter has none. Shorten's migration (`card`) writes the file for both: the card's title, tags and tier go to the frontmatter, its label, as plain text, to `description`, and the card's line goes, the rest of the text byte for byte. (A `tags=` on any other cell is its clusters, as above.)

**The convention for examples** (a test checks the first two): no card (no `&piece`: the description is the frontmatter's), and the notes are named `&…Note`; the description is one sentence (what the piece is, no `&names`, no instructions); how it works and what to try go into notes beside the cells they explain (`&filterNote label="…" about=(&fenv &accent)`), a topic each.

**The order of the cells** (judgment, nothing checks it): clock → harmony → parts → voices → mix → arrangement → out. An arrangement is the selector that chooses between the sections of a table (`&song`, `&tetris` over `&sections`; decision 016); it comes after the parts and before the sound card. A table may sit beside the part that reads it. Reordering lines does not change the sound.

**Tags have kinds**, told apart by a prefix: `genre:jazz` (a style), `artist:Bach` (whose music it is after or about), and a tag without one is a **topic** (a technique or an idea: `rhythm`, `canon`, `tuning`). **`tutorial`** is a kind of its own and its only tag: the piece is in a tier of the tutorial (below). The library shows the name only and groups by kind; the five main genres (`genre:classical`, `genre:jazz`, `genre:electronic`, `genre:experimental`, `genre:world`) are the rim of its wheel. A piece saved before the prefixes keeps working: a bare `jazz` or `Bach` is read as `genre:jazz` and `artist:Bach`, `basics` as `tutorial`, and any other bare tag is a topic. The examples use only the tags of `VOCABULARY` in `src/engine/tags.ts` (a test fails on any other): to add a tag, add it there. (A cell's own `tags=` inside a piece are clusters, not kinds.)

## The tutorial: tier

**tier: n** in a piece's frontmatter puts it in a tier of the tutorial, which runs from the first steps to physics in nine tiers: `title: "Steps: a tune on one line"`, `tags: [tutorial]`, `tier: 1`. The library draws the tutorial as a cell of its own beside the wheel of pieces, tier by tier; a piece with a tier carries the `tutorial` tag. Written the old way it is `tier=n` on the card (anywhere else it is an error).

A tier is a stretch of the language: a set of forms of the [reference](reference.md), each form on exactly one tier. Its pieces, as many as it needs (the lowest tier has the most, and the smallest), together show every form the tier introduces, and none uses a form of a later tier. `TIERS` in `src/engine/ladder.ts` lists the forms of each tier and the tiers' names; its test reads what every piece uses and fails on a form used before its tier, a form of a tier that none of its pieces shows, or a form on no tier. A new form in the reference needs a tier (and a piece of that tier needs to use it).

The tiers' numbers are stable, and a piece has no number of its own: a variation is a new file, listed in `ORDER` (`src/engine/order.ts`) where it reads best in its tier, and no card changes. A new tier goes at the end. The tiers and what they introduce are listed in [examples.md](https://github.com/yggi/cell-studio/blob/main/docs/examples.md#tutorial).

## show=

**show=name** says how a cell is drawn. It is the default for everything below the cell (its parts, `&refs`, its tables), wherever it fits; `step=` drivers are not below. An unfit show is ignored. `petal` and `off` belong to the cell alone, and so does a **plugin's** show: a piece can carry the code for a show of its own ([plugins.md](plugins.md)).

| kind | shows (first is plain) |
|---|---|
| voice | `wave` (its waveform: one cycle, the sound while it plays) `spectrum` `petal` `off` |
| braid | `braid` `pattern` `notes` `midi` `do` `degrees` `petal` `off` |
| table | `table` `scale` `mode` `key` `brightness` (each segment shaded by how bright its mode is) + the note shows |
| meter | `meter` `pattern` `sun` (a built-in plugin: a day meter as a 24-hour dial, noon at the top) · grid: `grid` `table` · envelope: `adsr` `table` |
| volume | `levels` (bars) `braid` `pattern` · oscillation: `lfo` `levels` `braid` |
| selector | `matrix` (a ring per section, a pin where it plays) `braid` `pattern` |

Without `show=` it is inferred (a table of 12 is a `key`, a recognised mode a `scale`). **Conventions**: `notes:flats` `notes:sharps` `notes:german`, `do:fixed` `do:movable`. A mix (or the sound card) colours by the grid its voices are on, and shows no colour when they are on several; **`show=mix:&grid`** names the grid it follows instead (`&band show=mix:&edo19 [&a * &v, &b * &w]`; [tuning.md](tuning.md)): the grid right after the colon, no space; on a cell that isn't a mix it does nothing, and warns. `petal` hangs a small cell from the one that uses it; `off` hides it from the graph (`off` alone also silences it).

## size=

**size=n** draws a cell `n` times as large against the others (`.25` to `4`, default 1): `&bar size=2`.

## Scopes

**scope=** makes a cell a screen; its braid lists its channels, `&a &b`. A scope is read in the graph's margin, and each cell it watches wears a dot in its channel's colour ([../ui/graph.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/graph.md): the margin). `stack` overlays, `split` a band each, `xy` draws the first against the second (a Lissajous figure). A sound shows its waveform; a stepped or gliding cell its value over the last two seconds. `spectrum` and `waterfall` show frequency: **fold=n** pitches folded by stride (12, by pitch class, default), **bins=n** that many bands without a fold, **channels=sum|split**.

```cells
&bar scan(1 1 1 1) step=60bpm
&strike step=pulse/6 0
&tonic body=fork loop=A3 ring=7 board=none 0
&fifth body=fork loop=A3 ring=7 board=none 7
&screen scope=xy label="x: the tonic · y: its fifth" &tonic &fifth
&out loop=SAMPLE_RATE map=sample [&strike * &tonic * .5] [&strike * &fifth * .5]
```

## Sentences

The detail sheet describes a cell in one sentence with its cells as links ("Plays 20 steps through &scale, stepped by &bar, on &lead."), then its connections by relation: reads, stepped by, made of, plays on, played by, shaped by, goes to, picks, moves, steps, used by.

## Loudness: the card's postgain=

The sound card's **`postgain=`** is its master, a linear gain (1 as it is, .5 about −6 dB): [mix.md](mix.md#the-sound-card). Examples set it from a loudness check (the convention: about −24 dB average, the median of the library, and a peak under −1 dB; a piece that can't have both, like a crushed big beat, keeps the peak): render to WAV (it reports the average and peak), or in the console `await cellStudio.measure(seconds?)` returns `{rms, peak, clipped}` in dB below full scale. A check that finds 1 leaves it out; a piece with no card written is heard through the built-in card, at .8. To turn a dB figure into it: `10^(dB/20)` (+6 dB is 2, −6 dB .5). Gains belong to the mix: [mix.md](mix.md); a voice's own gain (`gain=.8` on a voice: linear, a kit member's balance) is in [sound.md](sound.md); a gate's intensity (`level=`, linear) is in [mix.md](mix.md#a-gate-a-product-with-a-name).

## Limits

- A note cannot point at the cell it explains.
- Tag clusters overlap in the largest pieces.
- A restarted part's playhead shows the global clock, not its own ([braid.md](braid.md)).
- Physical cells draw as turntables: [physics.md](physics.md). See [../limits.md](https://github.com/yggi/cell-studio/blob/main/docs/limits.md).
