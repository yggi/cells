# Tables

Reading through a table: `over=`, `shift=` and `scale()` say which grid a cell's numbers index into.

- **`over=&t`** — a number x means entry x of &t; past the end it climbs a lap. Without `over=`, a cell reads through the table of whoever splices it. A table is its numbers: cells spliced into it aren't entries, and reading through one says so (unless it's a kit, a table of voices, or a selector's table of mixes: [time.md](time.md)).
- **`scale(name, tonic)`** is a scale by name over the 12 turned to its tonic: a key and a mode in one, for when the mode is fixed. It is exactly two cells, the key (`shift=` the tonic) and the scale's `scan(…)` over it ([decision 013](../decisions/013-scale-generator.md)).
  - In a braid the cell is the scale: `&scale scale(minor, D)` is D minor. Its `shift=` walks its modes, as on any cell; the tonic argument transposes. The tonic is a note name (`D`, `F#`, `Bb`), a number, or `free(…)` (the cell's own slider, its *tonic*; `free(D)` chooses among the twelve by name, and is written back by name); left out, C. `shift=free(G)` turns a key the same way.
  - After `over=` it is a table of its own, unnamed: `&tune over=scale(major, G) 0 2 4`.
  - The names: `major` `minor` `ionian` `dorian` `phrygian` `lydian` `mixolydian` `aeolian` `locrian` `harmonic` `melodic` `pentatonic` `minorpentatonic` `blues` `wholetone`; each a plain `scan(…)` you could write out.
  - The older `scale(tonic, phase)` (a mode by number, 0 the darkest) still reads, with a warning that says it by name: `scale(9, 2)` is `scale(minor, A)`.
  - Write the key and the mode as named cells when you want to turn or step them apart.
- **`fifths()`** is the circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C. `fifths(1)` (or `fifths(G)`) turns it to start on G: it is its `shift=`, so `&circleG[0]` is G and `&circleG[$0]` C ([decision 012](../decisions/012-picks-are-taps.md)). A cell nothing plays whose entries are whole numbers, each once, within one lap, but in an order of their own (not the pitches'), is a table drawn evenly round its wheel in that order; its taps stay put as it turns. A curve of values (`0 1 .3 -1`, read by `map=`) or a motif with a repeat stays a braid.
- **`shift=n`** rotates the braid by n; wrapped entries climb a lap. On a table it turns what reads through it ([time.md](time.md) for a moving shift).
- **Picks and shifts of a table** (`over=&scale[<<]`) are on [braid.md](braid.md).
- **A turning table comes round after its own length**: a stepped key of 12 after 12 turns (`&key … stride=7` goes round the circle of fifths), a scale after its 7, a braid of chords after its chords. Within that, a turn that wraps climbs a lap, like every shift. **`cycle=n`** has one job everywhere — how many before it comes round — and says otherwise: per tonos' `&key … stride=2 cycle=24` rises two octaves, then starts again; IDM's `cycle=2` turns twice and back ([decision 008](../decisions/008-tables-come-round.md)).

```cells
&line step=1 over=&scale 0 2 4 2 0
&scale over=&key scan(2 2 1 2 2 2 1) step=cycle(&line)
&key step=cycle(&scale) stride=7 cycle=12
```

```cells-fragment
&line2 over=scale(minor) step=1 0 2 4
&line3 over=scale(dorian, D) step=1 0 2 4
&blues scale(blues, Bb)
&line4 over=&blues step=1 0 1 2 3 4 5
&circleG fifths(G)
&line5 step=1 &circleG[0] &circleG[1] &circleG[$0]
```
