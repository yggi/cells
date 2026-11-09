# The canonical spellings: what Normalise writes

The language has several ways to write one thing, and keeps them: a text is its author's. **Normalise** (`normalise(source)`,
`npm run normalise -- <files>`) writes each such thing one way, for the examples, a corpus, the round trip, and before a
fragment is hashed. It is a command of its own, never offered while a piece is being written (decision 017). It writes the canonical form, which may change, add and remove cells
(decision 049, amended for #196); each rewrite sounds identical (S1), or is not made, and a normal text stays as it is. Shorten, which makes a piece more compact, is another tool.
On a page of the docs, whose cells blocks are each a piece of their own, `npm run normalise -- --blocks <pages>` normalises each block alone; `--rules meter,tempo` keeps a pass to those rules' rows (a Rewrite's `rule`), as the docs' meters were written (#196).

A row joins this page when the owner rules it (the canonical table, [#27](https://github.com/yggi/cells/issues/27)), and
Normalise writes it from then on.

## Parameters: ours, not Strudel's or dough's other name

Strudel and dough have other names for some of the sound parameters ([sound.md](sound.md)); cells reads them as its own, in
the same units (decision 027). Normalise writes ours, whatever its length; Shorten offers it only where ours is shorter.

| written | Normalise writes |
|---|---|
| `sound=` | `s=` |
| `cutoff=` `ctf=` `lp=` | `lpf=` |
| `resonance=` | `lpq=` |
| `hcutoff=` `hp=` | `hpf=` |
| `hresonance=` | `hpq=` |
| `bandf=` `bp=` | `bpf=` |
| `bandq=` | `bpq=` |
| `verb=` `reverb=` | `room=` |
| `delayt=` `dt=` | `delaytime=` |
| `delayfb=` `dfb=` | `delayfeedback=` |
| `clip=` | `legato=` (Strudel's `clip` is its `legato`; `clip=` warns until it is rewritten, #94) |

```cells
&bar meter("4/4") step=120bpm
&tune over=scale(major) step=8n legato=.5 0 2 4 2 4 5 7 4
&lead s=saw loop=C4 lpf=800 room=.3
&mix [&tune * &lead]
```

An alias written beside its own name (`cutoff=800 lpf=900`) is one parameter given twice, which the parser says; Normalise
leaves it for the author.

## The main key: named, `over=&key`

`over=key`, the main key read the old way ([tables.md](tables.md), [decision 060](https://github.com/yggi/cells/blob/main/docs/decisions/060-the-key-is-named.md)), is written `over=&key`, the cell it reads, by its name (Migrate's rule, `migrate/mainkey.ts`, which Normalise runs first): the first cell in the text whose braid is `scale(…)`, whatever it is called (`over=&chords` where `&chords scale(aeolian, A)` comes first). The two read one table, so the rewrite plays the same notes. A text with no main key is left as it is: its `over=key` is an error.

| written | Normalise writes |
|---|---|
| `over=key` | `over=&key`, the main key by its name |

## The names for people: `&bar`, `&tempo`, `&key`, `&tonic`

The names Normalise writes where the piece names each unambiguously (`normalise/names.ts`, #196), so a reader finds the meter, its tempo, the key and its tonic by the same names in every piece. A convention of the tool's, which nothing reads: a piece that names its meter `&m` plays as one that names it `&bar` ([decision 075](https://github.com/yggi/cells/blob/main/docs/decisions/075-a-name-is-only-a-name.md)).

- **`&bar`** is the piece's one meter, of its own lines (the compile's main meter, and no other meter beside it), where it is a bar: its first four beats at 40 to 300 bpm (`BAR_BPM`). A clock that laps a day (fiveto12's `&day`) or a scan of slow durations (studie's `&time`) is a meter and no bar, and keeps its name.
- **`&tempo`** is a bar's rate written as a value: `step=120bpm` becomes `step=&tempo` and a cell `&tempo step=120bpm`, a slider (`free(…)`) with it.
- **`&key`** is the piece's one key, the one cell of its own lines whose braid is `scale(…)` (the compile's main key).
- **`&tonic`** is the key's tonic written as a note: `scale(minor, A)` becomes `scale(minor, &tonic)` and a cell `&tonic A`; a key with none (`scale(major)`, the voice's `loop=` its tonic) has no `&tonic`.

None is written where the name is taken, where the line runs on to the next, or where the cell has one of these names already (BWV 847's tempo map, `&tempo`, isn't renamed `&bar`). A rename rewrites every reference.

| written | Normalise writes |
|---|---|
| `&time scan(1 1 1 1) step=96bpm` (the one meter, at 96 bpm) | `&bar meter("4/4") step=&tempo` and `&tempo step=96bpm` |
| `&scale scale(dorian, D)` (the one key) | `&key scale(dorian, &tonic)` and `&tonic D` |

## A meter built by hand: the meter it is

A meter a text builds out of something else is written as the meter's own form (`normalise/meter.ts`, #645, part of #15), each only where the two sound identical:

- **Even beats as a signature.** The main meter as a scan of equal entries, `scan(1 1 1)` or `scan(4 4 4 4)`, is `meter("3/4")`, `meter("4/4")`: the beats it counts, two to twelve each entry a beat (1) or four sixteenths (4); #196 wrote `scan(1 1 1 1)` so, and this is every count. A scan of 3s may be 6/8 or 3/16, and stays. Where a piece reads `&bar` as more than a meter (its values: baustelle, effects, moving, waveforms), they don't sound the same, and the scan stays.
- **A swing clock as a swing.** A clock of two that lines tap by its pulse to play long and short, `&swing scan(2 1) step=8n` read by `step=&swing:pulse`, is the main meter's swing: `&bar … swing=&swing`, the clock a swing alone, `&swing swing=8n:2/3` ([time.md](time.md), #308), its lines on the note value, `step=8n`. The share is the clock's first entry over the two, x / (x + b). A ratio left free is a share left free, `free(2, 1..3)` → `free(2/3, 1/2..3/4)`: the same notes where it starts, its slider now the share. The clock keeps its name, so a note about it still points at it. A clock on a level whose pairs the meter doesn't lean (eighths in 6/8, which are threes: decision 071), or one a line reads as more than a pulse, stays as it is.

| written | Normalise writes |
|---|---|
| `&bar scan(1 1 1 1) step=&tempo` | `&bar meter("4/4") step=&tempo` |
| `&bar scan(1 1 1 1 1) step=&tempo` | `&bar meter("5/4") step=&tempo` |
| `&swing scan(2 1) step=8n`, `&ride step=&swing:pulse …` | `&bar … swing=&swing`, `&swing swing=8n:2/3`, `&ride step=8n …` |
| `&swing scan(free(2, 1..3) 1) step=8n` | `&swing swing=8n:free(2/3, 1/2..3/4)` |

## The library's lines: a `from` line

A line of the piece that is a library fragment's line word for word, its comment aside, is written as a `from` line of that fragment (`normalise/library.ts`, #196): the piece says what it takes from the library rather than writing it again.

- A line has one home: the first fragment, in the library's order, that holds it.
- The lines taken from one fragment are one `from` line, written where the first of them was, their comments kept; a `from` line of that fragment the piece already writes takes the names too.
- Nothing is taken where it would not sound identical (a fragment whose helper the piece writes otherwise, which the compile refuses, or a template's line, which a `from` line takes only with its arguments).
- The library comes with the call, `normalise(source, { resolve, library })`; `npm run normalise` reads the seed library. With none given, Normalise takes nothing.

| written | Normalise writes |
|---|---|
| the General MIDI kit's `&bd`, `&sd` and `&hh` lines, word for word | `&bd, &sd, &hh from gm_kit` |
| `pitch=&(map=lin loop=5 0 .1 0 -.1 0)`, the `vibrato` fragment's cell written inline | `pitch=&vibrato` and `&vibrato from vibrato` |

A fragment's cell written inline, `&(…)` word for word, is taken the same way: every place it is written becomes the cell by name, and one `from` line of it joins the piece's (after its own `from` lines, or first). Not where the piece defines the name itself. A fragment's own file is normalised against the rest of the library, never as a `from` line of itself.

## `from`: kept, never expanded

Normalise keeps each `from` line in its order, a collection's the narrowest (`* from gm_kit` as the cells of it the piece reads, `normalise/narrowest.ts`, #449). It never writes the used fragment's lines into the piece: that is no canonical form (decision 049; `expand` writes them out on request). A text with `from` lines is normalised with the host's resolver, `normalise(source, { resolve })`, so that it compiles. A `from` line of a fragment that only forwards, a retired id, is written as the line it forwards to (Migrate's rule, `migrate/forwarded.ts`: `* from "core kit"` is `&bd, &rim, … from gm_kit`, #196). A `use` line is retired, and read by nothing since #588 ([use.md](use.md)).

## `from`: what a `use` line was

A `use` line was the old way ([decision 065](https://github.com/yggi/cells/blob/main/docs/decisions/065-fragments-take-arguments.md)). Migrate wrote it as the `from` line that plays the same until v0.20.0; since #588 nothing reads one, and [use.md](use.md#use-retired) says how to write it by hand.

## The narrowest `from`: the cells a piece uses

`* from foo` is a shorthand for all of `foo` that the piece uses (the owner, on [#157](https://github.com/yggi/cells/issues/157); [#27](https://github.com/yggi/cells/issues/27)'s row). So a collection's `* from` is written as the cells of it the piece reads, in the fragment's order, and a list of names drops any the piece reads nothing of, keeping the order written (`normalise/narrowest.ts`). A named cell brings what it reads, as `*` did ([use.md](use.md)).

| written | Normalise writes |
|---|---|
| `* from gm_kit` and `&beat … &bd ~ &hh …` | `&bd, &hh from gm_kit` |
| `&bd, &rim, &hh from gm_kit`, `&rim` read by nothing | `&bd, &hh from gm_kit` |

- A cell the piece defines itself is its own, its line winning, so it isn't taken.
- A `from` line the piece reads nothing of stays as it is: a band of performers plays by itself. Every rewrite is checked to play the same (S1), so a `*` that brings lines which sound on their own stays too.
- A template's copy (`&key from dorian D`) names its heads already: nothing to narrow.
