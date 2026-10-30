# 065 · Fragments take arguments: `&key from harmonic_minor D`, `&bar from swung_4_4(swing=8n:.64) &tempo`; a signature declares them, one main and the rest optional; `use` retires

**Date:** 2026-10-30 · **Status:** accepted (owner, 2026-10-30: "we drop use and keep the parentheses for named arguments", "keep &key", "only for declared parameters, with a distinction between required/no-default and optional/with default … there may be one required argument, the main argument. all named parameters are optional"; then, on the signature, a single reference and a step on an argument: "accepted as suggested") · Amends [047](047-fragments-are-files.md) (points 1–3: what a fragment reads is declared, not only derived), [054](054-instruments-and-use.md), [059](059-named-use.md) and [060](060-the-key-is-named.md) (§3, the interface names) · Issues: #387, #81, #290, #296, #354

## Context

[Decision 059](059-named-use.md) made a `use` say what it takes, `use &key from "harmonic minor"`. What it gives is still read by name: the mode reads `&tonic`, and the piece writes `&tonic D`, with nothing in the text that ties the two. The owner (2026-10-30): "now we have the magic &tonic, that is read by &key, without anything pointing at the relation between them. also we are forced to use the names inside the fragments".
Measured at 1996532 (#387):

- **A cell that happens to share an input's name is bound to it, silently.** `use &key from dorian` with a drone `&tonic s=tri loop=A3 7` plays dorian on G: the drone's braid, which its voice ignores, is the key's tonic. `examples/harmonograph.md` has a `&tonic` of its own, a tuning fork.
- **A fragment can't be used twice.** Two modes are an error (`&key` defined by both), and two walking basses would be (`&bassNext`).
- **Parameters in disguise.** Every named use that takes more than one cell from a fragment with a head names a cell so the piece can write its own: `&swing` (a swung meter), `&b` (AABA), the performers' instruments.
- **One input fits the library.** Of the 110 seed fragments, 30 read nothing by name (sounds and taps aside), 76 one (the meters `&tempo`, the modes `&tonic`, the harmonies and motifs `&key`, the bass lines and stabs `&harm`, the forms their phrase), and 4 two: the performers, their part and its level.
- **The grammar is free for it:** `&key from major C` and `&bar, &swing from x` are parse errors today.

## Decision

### 1. A line says where its cells come from; `use` retires

```text
&key from harmonic_minor D                    # the rest of the line: the main argument
&key from harmonic_minor(tonic=&my_fav)       # named arguments, in parentheses
&bar from swung_4_4(swing=8n:.64) &tempo      # both
&bd, &sd, &hh from gm_kit                     # a collection: the cells it names
* from gm_kit                                 # every line
&vibrato from vibrato                         # a fragment named as its head
```

- **A line that starts with `&x` defines `&x`**, whether it writes it or takes it from a fragment.
- **Named arguments are in parentheses**, never bare on the line: a cell's attributes come before and after its braid, so a bare `swing=` couldn't say whether it is the fragment's parameter or an attribute.
- **`use …` is the old way for a release**, with a warning naming the new spelling; Normalise writes the new (Migrate, decision 049).

### 2. A fragment declares its parameters: a signature

A `from` line with no id, in a fragment, is its signature:

```text
&key from &tonic                              # harmonic_minor
&bar from (&swing) &tempo                     # swung_4_4
&bass from (&voice, &level) &part             # bass_performer
&chorus from (&b) &a                          # aaba
```

- **The head** on the left, **the optional parameters** in parentheses, **the main parameter** after them.
- **An optional parameter has a line in the fragment, its default** (a `from` line itself, maybe: `&voice from bass`). **The main parameter has none: it is required, and the only one that may be.**
- **A keyword is its cell's name**: `swing=` binds `&swing`.
- **A signature's one head takes the name the using line gives** (`&scale from major C`, `&bass2 from bass_performer &walk2`); several heads are taken by their names.
- **A fragment with no signature is a collection** (a kit, the envelopes, a groove's limbs): a line takes names it defines, never renamed, since a kit member's name is its drum note (054) and a role cell's its role (061).

### 3. A use is a copy; only declared inputs

- **What a fragment defines and the line doesn't name is private to that use.** A fragment can be used twice, and its cells can have short names (`&voice`, `&part`) without meeting a piece's.
- **A fragment reads only what it declares or defines.** Anything else is an error, but two: what it reads as a sound (a groove's `&bd`: the kit's vocabulary, as note names are) and its taps of the main meter (time).
- So `INTERFACE_NAMES` retires, the fit reads the signature, and a motif passes its key: `&gypsy from gypsy &key`.

### 4. Attributes before `from` are the head's; after the id, the main argument's

```text
&key label="my key" from major label="the tonic" free(D)
```

- **Before `from`:** the head's. They override what the fragment's head line sets, the rest inherited, as `base=` does (decision 026): `&bassline legato=.5 from walking_bass &harm`.
- **After the id:** the main argument, its attributes and its braid one cell: the tonic's label is its slider's, `step=1m/8 D F` steps it (decision 060).

### 5. An argument is a cell

- **One bare reference is that cell** (no `^`, no pick, no attribute): `&bar from swung_4_4 &tempo` binds the piece's `&tempo`, and a host's slider on it keeps working. Elsewhere a cell whose braid is one reference is not that cell (`&t2 &tempo` never moves), so this holds where an argument is read.
- **Anything else is a new cell, read as the fragment reads the parameter:** a rate where `step=` reads it (`&(step=124bpm)`), a swing where `swing=` does, a note where it is a tonic.

### 6. A value argument is its default, changed where it says

- **It inherits its default's attributes where it sets none; its braid replaces the default's whole.** `aaba(b=&a^-3)` keeps `step=8n` from `&b step=8n &a^3`, and plays: a referenced cell plays at the referring cell's step, so `&b &a^3` alone plays nothing.
- Not `base=`'s delta, step by step, for the braid: a default `0 2 4 7` given `5` would play `5 2 4 7`.
- A reference argument (5) inherits nothing: it is the piece's cell.
- With §4: **a cell given at a use is the fragment's cell, changed where it says.**

### 7. The key keeps its name

`&key` stays the key's name, by convention now, not by the compiler: names say a cell's role, generators its kind (`&bar meter(…)`, `&key scale(…)`), and a key's change is a modulation, which the stepped tonic plays.

## Why

- **The relation is written where it is made.** `&key from harmonic_minor D` says what the tonic is for; a cell that shares a name with an input binds nothing.
- **One required argument, the rest optional, fits every seed fragment** as measured, and makes the shortest form the common one.
- **Arguments as cells** keep everything a cell can say (a label, a range, a step) sayable of an argument, where it is given.
- **Private names** make a fragment a template, usable twice, and let a corpus be split into fragments as a well-posed search: two passages that differ in one part generalise to a fragment with one parameter.

**Why not** `use` as a cell attribute (`&key use="harmonic minor" tonic=D`): a fragment's parameters would share the attribute namespace (82 attributes, 15 aliases: `swing=` is both), and a collection gives more than one cell.
**Why not** named arguments without parentheses, for the reason in §1.
**Why not** several unnamed arguments: adding a parameter to a shared fragment would move what every piece's arguments mean.
**Why not** a fragment called as a generator (`&key major(C)`): it would share a namespace with `scale`, `meter` and `euclid`, hide that a library and a lockfile are read, and have no spelling for several cells.
**Why not** `&scale`: see §7; the head takes any name a piece gives it.

## Consequences

- Rungs (#387): the language (the parser, the copy per use, the checks, `CompileResult.uses` with arguments, `use` the old way); the seed library's signatures, with the ids as words (#296); Normalise's migration, the examples and the docs; the repository reading signatures, `INTERFACE_NAMES` gone once the frontends have migrated; the frontends' issues.
- No example's event snapshot moves: `use &key from dorian` with `&tonic D`, which only the fragment reads, is `&key from dorian D` by construction.
- A minor version; the changelog names the migration. Jambot's section text and `mode-repository.ts`, and Cell studio's used group (its decision 038), follow at the pin that carries the examples' rung.
- Decision 063's score ends in `use * from band`: it is `* from band`. 063 landed first, so its line in the decisions list and the cheatsheet says so (its record keeps what was ruled).
- **Open:** whether a main parameter may have a line of attributes alone, inherited by its argument (`&call step=8n`, so `&a from call_and_answer &gypsy` needs no `step=8n`).
