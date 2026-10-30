# `from`: where a line's cells come from

A line says where its cells come from: a fragment of a library, by its id ([decision 065](https://github.com/yggi/cells/blob/main/docs/decisions/065-fragments-take-arguments.md), [#387](https://github.com/yggi/cells/issues/387); before it, [decision 054](https://github.com/yggi/cells/blob/main/docs/decisions/054-instruments-and-use.md) and [decision 059](https://github.com/yggi/cells/blob/main/docs/decisions/059-named-use.md)'s `use`).

```cells
&bar from "4/4 swung on 8n"(swing=8n:.64) 120bpm
&key from "harmonic minor" D
&harm from "vamp to the fifth" &key
&bassline from "walking bass" &harm
&bd, &sd, &hh from gm_kit
&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]
&bassV s=saw loop=C2
&out [&beat, &bassline * &bassV]
```

- **A template**, a fragment with a signature, gives a copy: `&key from "harmonic minor" D`. The rest of the line is its main argument, its named arguments are in parentheses (`(swing=8n:.64)`), and attributes before `from` are its head's (`&key label="my key" from …`).
- **A collection**, a fragment with none (a kit, an instrument, the envelopes), gives the cells it names by their names, and the lines they read within it, its *helpers*: `&bd, &sd, &hh from gm_kit`; `* from gm_kit` gives every line.
- **The id** is a word (`gm_kit`), or any id in double quotes (`"harmonic minor"`); a word is written bare.

## A fragment's signature, a template's copy, and its arguments

- **A fragment's signature** is a `from` line with no id: `&bar from (&swing) &tempo`, its head, its optional parameters in parentheses, its main one after them. An optional parameter has a line in the fragment, its default; the main one has none, and is the only one that is required. A keyword is its cell's name (`swing=` binds `&swing`). The seed library's templates have theirs: the meters, the modes, the harmonies, the bass lines, the motifs, the forms, the stabs and the performers (`signatureOf`, and `bodyOf` for a fragment's lines without it).
- **A `from` line takes a copy of a template.** Its one head takes the name the line gives (`&scale from major C`); several heads are taken by their names (a performer gives its role and its gate, `&bass, &bassOut from "bass performer" &line`), and `*` takes them all. It takes what those heads read, as a named use took its closure. Every other name the copy defines is its own, `&<head>_<name>` (`&key_tonic`), so a template can be used twice and its cells meet none of the piece's. What it took from a collection (a kit, an instrument) keeps its names: a drum's note is its name.
- **An argument is a cell.** One bare reference is that cell (`&bar from "4/4" &tempo` reads the piece's `&tempo`, its slider and all). Anything else is a cell of the copy's, read as the template reads the parameter: `124bpm` where `step=&tempo` reads it is `step=124bpm`, a rate alone, and `8n:.64` where `swing=&swing` reads it is that swing. A named one is its default changed where it says: it keeps the default's attributes where it sets none, and its braid replaces the default's whole (`AABA(b=&a^-3)` keeps `&b`'s `step=8n`).
- **Attributes before `from` are the head's**, over what its line sets; **after the id, the main argument's** (`… from diatonic label="the tonic" free(D)` labels the tonic, its slider).
- **What it says:** a main argument missing, or given to a template that takes none; a keyword the signature lacks; a head the template doesn't have; an argument given to a collection; a signature that names what the template doesn't define, or a main parameter with a line. A template that reads a name it neither defines nor declares, in an attribute, a generator or through an operator, is an error: a cell of the piece's that shares the name is never bound to it. A name read as a sound, a step or a mix's term (`&bd`), is the kit's vocabulary, read by name.
- **`CompileResult.uses`** holds each from line, a copy's arguments as written (`args`), the main one under its parameter's name, and what it gave, its own names among them. A copy's lines are the piece's own, so the built-in card hears them; what a collection gave by name it doesn't.

What a line reads without writing it, the main meter a `step=16n` taps, is never taken: it is the piece's.

## `use`, the old way

`use &bd, &sd from gm_kit`, `use * from gm_kit` and `use &x` (`use &x from x`) still read, for a release, as the `from` lines of a collection do, and each warns that it is the old way, naming its `from` line; Normalise writes it, with a template's arguments ([canonical.md](canonical.md)).
A `use` of a template takes its lines as they are, and reads its parameters by name, as before decision 065: a line the piece writes for one of them (`&tonic D`, `&swing …`) is its argument, as an interface name the piece defines is (`&key`, `&bar`, `&tempo`, `&tonic`, `&harm`, decision 060). `use * from` a fragment takes every line but one read only by lines the piece overrides (`use * from "4/4 swung on 8n"` under the piece's own `&bar` takes no `&swing`, and says the use adds nothing). `use "harmonic minor"`, older still, reads as `use * from "harmonic minor"`.

## The expansion: the piece's own lines win

What the compiler reads, the *expansion*, is the piece's own lines and each copy's, then the lines each collection gives that the piece doesn't define, in the order the `from` lines are written.
So a piece overrides a voice of the kit by writing it, and every line that reads `&sd` reads the piece's:

```cells
* from gm_kit
&bar meter("4/4") step=100bpm
&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]
# the piece's own snare: it wins over the kit's
&sd s=white hpf=900 distort=.6 env=&(map=adsr 0 .12 0 .05)
```

`expand(text, resolve)` writes the expansion out: the piece's lines, its `from` lines gone, then the kit's 46 other lines.
A fragment may itself take from others: its own lines win over what it takes, and the piece's over all.

- A line two used fragments give word for word (comments aside, whitespace collapsed) is one line.
- A line taken twice from one id is taken once, at its first `use`; a use that then takes nothing warns that it adds nothing.
- A name a use asks for that the fragment doesn't define is an error naming the names it does: `&agogo is not in "gm_kit": it defines &acousticbassdrum, &bd, &rim, …`.
- A name a use asks for that the piece defines is the piece's, and warns that taking it adds nothing, unless a line the use takes reads it: then naming it is how the piece overrides it, and says nothing (`use &bass, &bassV from "bass performer"`, the old way, with the piece's own `&bassV s=saw loop=C3`: the bass player, on the piece's sound; a copy reads an instrument's name the same way, `&bass from "bass performer" &line` with the piece's own `&bassV`). A `use * from` whose every line the piece defines warns too.
- A helper the piece also defines is an error: the piece didn't ask for it, so its line would change what the named cell reads. Rename the piece's, or name the helper in the use, which makes it an override.
- A name two used fragments define by different lines, and the piece doesn't, is an error naming the name and both ids: the piece writes the line itself, or drops one `use`.
  `use` never renames: a voice's General MIDI note is read off its name ([midi.md](midi.md)), and `&bd2` would send another.
- A cycle is an error naming it, and so is a depth past 8 (a kit in a groove in a section in a piece is 3).
- An id the library doesn't hold is an error naming it, and the piece's other lines compile as they would without it.
- **A retired id** is read for a minor version as a fragment that only forwards, one `use` of what took its place, and Normalise writes a use of it as that use (#196): `use * from "core kit"`, the 13 voices a groove needs before a `use` could name what it takes, is `use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit`, and `"gm kit"` is `gm_kit` (`RETIRED` in `src/repository/library.ts`).

Each of these is said on the piece's `use` line it came through, and so is what the compiler says of a used line.

## The built-in card hears only the piece

A piece with no card is heard through the built-in one ([mix.md](mix.md)): every sound nothing reads.
A used fragment's voices aren't among them, so a piece using the General MIDI kit doesn't hold its 47 voices: the `&beat` above is heard, the kit's unread toms aren't.
The piece reads a used fragment's lines on a card of its own (`&out map=midi(10) &groove`): the seed's pattern fragments carry no card, since where their notes go is the piece's (#291).

## The resolver: cells resolves nothing itself

The host hands each compile a resolver, from an id (and the hash a lockfile recorded, where it has one) to a fragment's text, or null: `compileSource(text, env, { resolve })`.
`resolveSeed` is the seed library's (`fragments/`), the current version of each fragment; a frontend's library, Jambot's learned layer or Cell studio's, is another.
Without a resolver, every `use` is an error.

What each `use` resolved to is data on the result, `CompileResult.uses`: its id, the names it asked for (`names`, null for `*`), its line, the hash of the text it resolved to, the names it gave (its helpers among them) and the names the piece overrode.

## The lockfile

A piece file's frontmatter records what each `use` resolved to, so a saved piece keeps sounding the same when a library moves on:

```yaml
uses:
  - id: gm_kit
    hash: e1:f1ce77754dab5d20
```

- The hash is `e1:` and a hash of the fragment's text up to layout (decision 050's E1, its rung written first, so a lockfile still checks once E4, what a hash reads, exists).
- `lockfileOf(file)` reads it, for the compile's `locked`; a recorded hash the library no longer gives plays the current version, with a warning naming the id.
- `withLockfile(file, result.uses)` records a compile's hashes; `writePiece` drops an entry no `use` line names.
- A raw text, or a file with no frontmatter, has no lockfile: it plays the current version, always.

## Normalise and the measure

Normalise keeps every `use` line, in its order, never expanded ([canonical.md](canonical.md)), in one spelling: `use * from …`, `use &a, &b from …`, `use &x` for `use &x from x`, an id bare where it is a word.
Shorten's measure counts a `use` line as one leaf, a reference; the used fragment's lines are the library's.

## Fragments with holes

A piece with `use` is a fragment like any other: its holes are its expansion's, a used fragment's holes the piece's, less what the piece and the other used fragments define.
`holesOf(text, compiled, resolve)` and `fitOf(fragment, workbench, compiled, resolve)` read it so, given the resolver: a used two-bar clave needs bars a whole number of its taps, as written out, so it doesn't fit 7/8; without a resolver, only the text's own lines are read.
A hole read only as a sound, a step of a braid or a term of a mix (a groove's `&bd`), never as a table or a clock, doesn't block a fragment's fit on a workbench: `fitOf` lists it in `sounds`, the instrument to ask for next.
