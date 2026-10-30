# Tables

Reading through a table: `over=`, `shift=` and `scale()` say which grid a cell's numbers index into.

- **`over=&t`** — a number x means entry x of &t; past the end it climbs a lap. Without `over=`, a cell reads through the table of whoever splices it. A table is its numbers: cells spliced into it aren't entries, and reading through one says so (unless it's a kit, a table of voices, or a table of sections a selector switches: [time.md](time.md)).
- **Over a braid of stacks, the chord in force** ([#95](https://github.com/yggi/cells/issues/95)): when every step of the table is a stack, `over=` reads the stack sounding at the note's onset, as Strudel's `n(…)` reads `.chord(…).voicing()`. Over `&harm over=&key step=2n [0,2,4,6] [4,6#,8,10]` in A minor, `0 1 2 3` plays A C E G under the first stack and E G♯ B D under the second; past the chord's last tone it climbs to the same chord a lap up (`4` is A an octave up, not the next chord's E), below its first it falls a lap (`-1` is G below), and an accidental moves a degree of the table below (`0#` under Am7 is B). `over=&harm[>>]` reads the next chord, `[<<]` the one before; after the last the next is the first, a lap up. A braid that mixes stacks and single numbers is not a braid of stacks: it reads as any table, its numbers in order as turned.
- **The key is named: `over=&key`** ([decision 060](https://github.com/yggi/cells/blob/main/docs/decisions/060-the-key-is-named.md), [#301](https://github.com/yggi/cells/issues/301)). A fragment that leaves its key to the text that uses it reads `&key`, a hole like any name, the interface name the modes define (decision 047). **`over=key`**, bare, is the old way ([#124](https://github.com/yggi/cells/issues/124)): it reads the piece's main key, the first cell in the text whose braid is `scale(…)` (never an unnamed `scale(…)` or a copy, `base=`), and warns, naming it: "over=key is the old way: name the key, over=&key"; Normalise writes the name. With no main key it is an error, never a default key. It reads the key whole: to turn it, name it (`over=&key[<<2]`).
- **`scale(name, tonic)`** is a scale by name over the 12 turned to its tonic: a key and a mode in one, for when the mode is fixed. It is exactly two cells, the key (`shift=` the tonic) and the scale's `scan(…)` over it ([decision 013](https://github.com/yggi/cells/blob/main/docs/decisions/013-scale-generator.md)).
  - In a braid the cell is the scale: `&scale scale(minor, D)` is D minor. Its `shift=` walks its modes, as on any cell; the tonic argument transposes. The tonic is a note name (`D`, `F#`, `Bb`), a number, a cell that holds one, or `free(…)` (the cell's own slider, its *tonic*; `free(D)` chooses among the twelve by name, and is written back by name); left out, C. `shift=free(G)` turns a key the same way.
  - **A tonic read from a cell** ([#290](https://github.com/yggi/cells/issues/290)): `&key scale(dorian, &tonic)` with `&tonic D` is D dorian. The cell holds one note, a name or a pitch class (`&tonic 2`); anything else is an error at it. A fragment that leaves its tonic to the text that uses it reads it so, a hole like a name (`holesOf` lists `&tonic`), with no default: a default tonic plays a wrong key silently ([#117](https://github.com/yggi/cells/issues/117)). A tonic's room is the performer's: `&tonic free(D)`, a braid left free ([free.md](free.md), decision 018), plays D until a take is held in its place, and the take is the tonic.
  - **A stepped tonic** ([#301](https://github.com/yggi/cells/issues/301)): `&tonic step=1m/8 D F` holds a note a step, held (`D@2`) or repeated (`D!2`) as any braid, and the key turns with it: every line over the key, and over a harmony over it, plays in the tonic in force, as if the key were written out for each section, and it comes round after its steps. Its notes are pitch classes (an octave written is left out), so a move from B to C goes down. Left free, `&tonic step=1m free(D F)`. A rest or a chord in it is an error.
  - **A mode read from a cell** ([#363](https://github.com/yggi/cells/issues/363), decision 064): `&key scale(&mode, &tonic)` with `&mode dorian` and `&tonic D` is D dorian. The seven diatonic modes are values, darkest to brightest, the tonic fixed: `locrian` 0, `phrygian` 1, `aeolian` (`minor`) 2, `dorian` 3, `mixolydian` 4, `ionian` (`major`) 5, `lydian` 6. One phase brighter raises one note a semitone, a fifth round the circle: the order the old `scale(tonic, phase)` reads, and the phase of `even(7, 12, phase)`, the diatonic necklace (not `euclid(7, 12, shift)`'s, which turns by semitones: brighter is its shift plus 7). A mode word reads as its number in any braid, as a note name reads as its pitch (`&mode major` is `&mode 5`). The cell holds one mode, a word or its phase; anything else is an error at it, and a stepped mode is not yet a form.
  - After `over=` it is a table of its own, unnamed: `&tune over=scale(major, G) 0 2 4`.
  - The names: `major` `minor` `ionian` `dorian` `phrygian` `lydian` `mixolydian` `aeolian` `locrian` `harmonic` `melodic` `pentatonic` `minorpentatonic` `blues` `wholetone`; each a plain `scan(…)` you could write out.
  - **Strudel's spelling reads the same** ([decision 027](https://github.com/yggi/cells/blob/main/docs/decisions/027-on-top-of-strudel.md)): `scale("D:minor")`, the tonic first and the name's words after colons, so `scale("F#:harmonic:minor")` is `scale(harmonic, F#)`. Inside the quotes every scale [tonal](https://github.com/tonaljs/tonal) knows reads, as Strudel reads it (`src/theory/tonal.ts`, its intervals copied): `melodic:minor`, `major:pentatonic`, `minor:pentatonic`, `whole:tone`, `diminished` (whole-half), `half-whole:diminished`, `chromatic`, `bebop`, `bebop:major`, `minor:blues`, `hirajoshi`, `in-sen`, `phrygian:dominant`, `lydian:dominant`, `altered`, `messiaen's:mode:#3` …, 131 names in all; ours read there too (`scale("D:minorpentatonic")`). Strudel's `n("0 2 4 6#").scale("C:minor")` is `over=scale("C:minor") 0 2 4 6#`. A tonic with an octave (`"C4:minor"`) is an error: the octave is the voice's (`loop=`).
  - The older `scale(tonic, phase)` (a mode by number, 0 the darkest) still reads, with a warning that says it by name: `scale(9, 2)` is `scale(minor, A)`.
  - Write the key and the mode as named cells when you want to turn or step them apart.
- **`fifths()`** is the circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C. `fifths(1)` (or `fifths(G)`) turns it to start on G: it is its `shift=`, so `&circleG[0]` is G and `&circleG[$0]` C ([decision 012](https://github.com/yggi/cells/blob/main/docs/decisions/012-picks-are-taps.md)). A cell nothing plays whose entries are whole numbers, each once, within one lap, but in an order of their own (not the pitches'), is a table drawn evenly round its wheel in that order; its taps stay put as it turns. A curve of values (`0 1 .3 -1`, read by `map=`) or a motif with a repeat stays a braid, and so does a list with a decimal in it that nothing plays (`&k 0 .5 1`): entries are whole numbers. `fifths(n)` past a lap (`fifths(13)`) is a turn like any `shift=`: it climbs a lap, an octave, and warns; `fifths(G)` names the note and never climbs.
- **`shift=n`** rotates the braid by n; wrapped entries climb a lap. On a table it turns what reads through it ([time.md](time.md) for a moving shift).
- **Picks and shifts of a table** (`over=&scale[<<]`) are on [braid.md](braid.md).
- **A stepped table turns by its braid's own steps** ([#122](https://github.com/yggi/cells/issues/122)): an entry held (`[0,2,4]@3`, or `[0,2,4] _ _`) or repeated (`[0,2,4]!3`) stays in force as many steps, and a subsequence's steps turn within its step (`[[5,7,9] [2,4,6]]` is one stack for the first half, the other for the second; `<a b>` one a lap), as the braid would play. A shift of such a table counts its entries, a subsequence's each one.
- **A table that also plays turns for what reads through it** ([#167](https://github.com/yggi/cells/issues/167)): a line over it reads the entry sounding, which is the entry the turn brings round when the table isn't played, so one rule covers both. A harmony both heard and read through: `&harm over=&key step=4n [0,2,4] [1,3,5] [2,4,6] [3,5,7]` played on a channel of its own, and `&pad over=&harm step=4n 0 0 0 0` plays each beat's root, C D E F, as it does when nothing plays `&harm`. What the table plays is its own braid, as written. Where the turn and the braid part (`stride=`, a `cycle=` other than its own length), the reader follows the turn. A played cell nothing reads through (no `over=`, no relative pick `&k[0]`) doesn't turn: its moving shift is only its playhead ([#203](https://github.com/yggi/cells/issues/203)).
- **A turning table comes round after its own length**, its braid's steps: a stepped key of 12 after 12 turns (`&key … stride=7` goes round the circle of fifths), a scale after its 7, a braid of chords after its chords, `[0,2,4]@3 [5,7,9]` after 4. Within that, a turn that wraps climbs a lap, like every shift. **`cycle=n`** has one job everywhere — how many before it comes round — and says otherwise: per tonos' `&key … stride=2 cycle=24` rises two octaves, then starts again; IDM's `cycle=2` turns twice and back ([decision 008](https://github.com/yggi/cells/blob/main/docs/decisions/008-tables-come-round.md)).

```cells
&line step=1 over=&scale 0 2 4 2 0
&scale over=&key scan(2 2 1 2 2 2 1) step=cycle(&line)
&key step=cycle(&scale) stride=7 cycle=12
```

```cells
&bar meter("4/4") step=120bpm
&key scale(aeolian, A)
&harm over=&key step=2n [0,2,4,6]@2 [3,5,7] [4,6#,8,10]
&bass over=&harm step=8n 0 2 4 2
&bassV loop=C2
&out map=midi ~ [&bass * &bassV]
```

```cells
&bar meter("4/4") step=100bpm
&key scale(dorian, D)
&bass over=&key step=8n 0 2 4 2
&v s=sine loop=C3
&out map=sample [&bass * &v]
```

```cells-fragment
&line2 over=scale(minor) step=1 0 2 4
&line3 over=scale(dorian, D) step=1 0 2 4
&blues scale(blues, Bb)
&line4 over=&blues step=1 0 1 2 3 4 5
&circleG fifths(G)
&line5 step=1 &circleG[0] &circleG[1] &circleG[$0]
```
