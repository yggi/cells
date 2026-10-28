# The canonical spellings: what Normalise writes

The language has several ways to write one thing, and keeps them: a text is its author's. **Normalise** (`normalise(source)`,
`npm run normalise -- <files>`) writes each such thing one way, for the examples, a corpus, the round trip, and before a
fragment is hashed. It is a command of its own, never offered while a piece is being written (decision 017). It writes the canonical form, which may change, add and remove cells
(decision 049, amended for #196); each rewrite sounds identical (S1), or is not made, and a normal text stays as it is. Shorten, which makes a piece more compact, is another tool.

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

`over=key`, the main key read the old way ([tables.md](tables.md), [decision 060](https://github.com/yggi/cells/blob/main/docs/decisions/060-the-key-is-named.md)), is written `over=&key`, the cell it reads, by its name (`normalise/mainkey.ts`): the first cell in the text whose braid is `scale(…)`, whatever it is called (`over=&chords` where `&chords scale(aeolian, A)` comes first). The two read one table, so the rewrite plays the same notes. A text with no main key is left as it is: its `over=key` is an error.

| written | Normalise writes |
|---|---|
| `over=key` | `over=&key`, the main key by its name |

## The interface names: `&bar`, `&tempo`, `&key`, `&tonic`

The names the seed library's fragments read (decisions 059 and 060), written where the piece names each unambiguously, so a piece in them takes a fragment as it is (`normalise/names.ts`, #196):

- **`&bar`** is the piece's one meter, of its own lines (the compile's main meter, and no other meter beside it), where it is a bar: its first four beats at 40 to 300 bpm (`BAR_BPM`). A clock that laps a day (fiveto12's `&day`) or a scan of slow durations (studie's `&time`) is a meter and no bar, and keeps its name.
- **`&tempo`** is a bar's rate written as a value: `step=120bpm` becomes `step=&tempo` and a cell `&tempo step=120bpm`, a slider (`free(…)`) with it.
- **`&key`** is the piece's one key, the one cell of its own lines whose braid is `scale(…)` (the compile's main key).
- **`&tonic`** is the key's tonic written as a note: `scale(minor, A)` becomes `scale(minor, &tonic)` and a cell `&tonic A`; a key with none (`scale(major)`, the voice's `loop=` its tonic) has no `&tonic`.

None is written where the name is taken, where the line runs on to the next, or where the cell has an interface name already (BWV 847's tempo map, `&tempo`, isn't renamed `&bar`). A rename rewrites every reference.

| written | Normalise writes |
|---|---|
| `&time scan(1 1 1 1) step=96bpm` (the one meter, at 96 bpm) | `&bar meter("4/4") step=&tempo` and `&tempo step=96bpm` |
| `&scale scale(dorian, D)` (the one key) | `&key scale(dorian, &tonic)` and `&tonic D` |

## The bar of four beats: `meter("4/4")`

`scan(1 1 1 1)`, the main meter as four even beats, is written `meter("4/4")` (#196), where the two sound identical. Where a piece reads `&bar` as more than a meter (its values: baustelle, effects, moving, waveforms), they don't, and the scan stays.

| written | Normalise writes |
|---|---|
| `&bar scan(1 1 1 1) step=&tempo` | `&bar meter("4/4") step=&tempo` |

## `use`: one spelling, kept, never expanded

A `use` line ([use.md](use.md), decisions 054 and 059) is written in one spelling (`normalise/uses.ts`): `use * from …`
for every line, `use &a, &b from …` for the names (a comma and a space between them), `use &x` where it takes `&x` from
`x`, the id bare where it is a word and in double quotes where it isn't. So `use "harmonic minor"`, the old way, is written
`use * from "harmonic minor"`: the two read as one. A use of a fragment that only forwards, whose text is one `use` and
nothing else, is written as the use it forwards to (`normalise/forwarded.ts`): a retired id, so `use * from "core kit"`
is `use &bd, &rim, … from gm_kit`, and a use that names what it takes keeps its names (#196). Normalise keeps each `use` line in its order. It never writes the used fragment's lines into the piece: that is no canonical form
(decision 049; `expand` writes them out on request). A text with `use` lines is
normalised with the host's resolver, `normalise(source, { resolve })`, so that it compiles.
