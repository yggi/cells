# 059 · A `use` says what it takes: `use &bd, &sd from core_kit`, `use * from core_kit`, `use &aeolian`; a helper the piece also defines is an error; ids are words where they can be

**Date:** 2026-10-26 · **Status:** accepted (owner, 2026-10-26: "python-style named imports: 'use &sd from core_kit' and 'use &aeolian' as shorthand for 'use &aeolian from aeolian'. 'use core_kit' would be an 'use * from core_kit'"; on #289, the same day: "1) error on collision 2) normal form is use * from id, use id is deprecated 4) we allow quoted IDs for now, but unquoted with safe name is preferred") · Amends [054](054-instruments-and-use.md) · Issues: #289, #288, #81

## Context

[Decision 054](054-instruments-and-use.md) brought a fragment into a piece with `use "gm kit"`: every line of the fragment the piece doesn't define, the piece's own lines winning.
The design note on the full chain ([#288](https://github.com/yggi/cells/issues/288), [docs/notes/288-full-chain.md](../notes/288-full-chain.md)) measured what that hides (cells 981ea22, the seed resolver):

- **What a use brings isn't said.** `use "Funk drums"` brings eight lines: six role lines, a level line and a MIDI card named `&drums`. The text names none of them.
- **A use that brings nothing says nothing.** In a section of seven uses that writes its own `&bar` and `&key`, `use "4/4 leaning on 16n"` and `use "dorian"` add nothing, and the compile was clean.
- **A head named for its fragment serves.** `&aeolian scale(aeolian, A)` is the first scale, so `over=key` reads it as the main key: a mode fragment `aeolian` could be the cell `&aeolian` (the seed modes' head is `&key` today, #296).

054 ruled "no namespaces at first", and a named use is not one: `&bd` stays `&bd` and keeps its drum note.

## Decision

### 1. The forms

```text
use &bd, &sd from core_kit       # the named cells, and the lines they read within the fragment
use * from core_kit              # every line: 054's use "core kit"
use &rising                      # use &rising from rising: a fragment whose head is named as it is
```

- **`use &a, &b from <id>`** takes the named cells, and the lines they read within the fragment, their *closure*: the names a taken line writes (`&x`) that the fragment defines, followed until none is left.
  - The closure's names the use doesn't name are the fragment's **helpers** (`&bassNext`, which `funk bass`'s `&bass` reads).
  - A line reads what it writes, `&x`; what a line reads without writing it (the main meter a `step=16n` taps, the main key `over=key` reads) is the piece's, never taken.
- **`use * from <id>`** takes every line the fragment defines and the piece doesn't: 054's form, unchanged in meaning.
- **`use &x`** is `use &x from x`: the fragment whose id is `x`, which defines `&x`.
  The seed modes define `&key`, so `use &aeolian` is an error today that names it (`it defines &key`); their heads named for them are #296.
- **What the piece defines wins**, as 054 has it, for every name a use asks for: the piece overrides a named cell by writing it, and `*` names every cell.
- A used fragment's own `use` lines take the same forms, and its expansion is what the closure is read over: `use &bass from "bass performer"` takes the gate and the instrument it uses.

### 2. Ruling 1: a helper the piece also defines is an error

A helper is the fragment's, not the piece's to override: the piece didn't ask for it, so a line of its own by that name would silently change what a named cell reads.
So it is an error, as 054's collision between two fragments is, naming the helper, the cell that reads it, and the remedy: rename the piece's, or name the helper in the use, which makes it an override.

### 3. Ruling 2: the normal form is `use * from <id>`; `use "<id>"` is deprecated

- `use "core kit"` still reads as `use * from "core kit"`, with a warning naming the new spelling.
- **Normalise writes one spelling** (`normalise/uses.ts`): `use * from …` for every line, `use &a, &b from …` for the names, `use &x` where it takes `&x` from `x`, an id bare where it is a word.
  It is the Migrate step for the old form: the two read as one, so the respelling plays the same by construction.

### 4. Ruling 4: ids are words where they can be; quoted ids stay for now

- **A bare id is a word** (`core_kit`, `aeolian`: a letter or `_`, then letters, digits and `_`). **An id in double quotes is any id** (`"core kit"`, `"4/4 leaning on 16n"`).
- Both are read; the bare word is preferred, and Normalise writes it wherever the id is one.
- The seed library's ids are not renamed here: 8 of its 51 are words already (`aeolian`, `bass`, `dorian`, `ionian`, `keys`, `lead`, `mixolydian`, `pad`), and the other 43 are used quoted until a rung renames them (#296), with the old ids read for a release.

### 5. What the compiler says

- **A name the fragment doesn't define is an error**, naming the names it does: `&cb is not in "core kit": it defines &bd, &rim, &sd, …`.
- **A named cell the piece also defines warns that taking it adds nothing**: `The piece defines &bar, so taking it from … adds nothing`.
  Amended (electroswing, #196's scouting): not where a line the use takes reads it, a helper named to override it (ruling 1's remedy), which said nothing else; otherwise the remedy ruling 1's error names warned in its turn, and an instrument's voice couldn't be given a sound with no diagnostic.
- **A `use * from` the piece overrides entirely warns the same**: `The piece defines all "dorian" gives (&key): this use adds nothing`.
- An id whose lines an earlier use took warns, as 054's second `use` of an id did.
- **`CompileResult.uses`** lists, for each use, the names it asked for (`names`, null for `*`), beside 054's id, hash, `gave` and `overrode`; `gave` holds the helpers too.

## Why

- **The text says what it takes**, so a reader, Cell studio's cluster of used cells, and the compiler all know it without the library: what a use asks for is in the line.
- **The closure, not the named lines alone**, because a named cell that reads a helper doesn't play without it; and the helper is the fragment's business, as a function's local is.
- **An error on a helper's collision**, the owner's ruling: an override is a choice the piece writes, and a helper the piece never named can't be one.
- **`*` as the normal form of the old one**, so every `use` has the same shape (`use … from …`), and an id stops being a string that happens to sit after `use`.
- **Words for ids where they can be**, as a cell's name is one (decision 037: a name is a word): a bare id reads as a name, and `use &aeolian` needs the id to be one.

**Why not** renaming (`use &bd as &kick from core_kit`): a kit member's name is its drum note and a performer's name its role (decision 058); renaming waits for the first workbench that needs two fragments' same name, as 054 ruled for qualified names.
**Why not** taking only the named lines and leaving the helpers as holes: the piece would have to define the fragment's private cells to play its public ones.
**Why not** renaming the seed ids now: every frontend names them (Jambot's section text writes `use "core kit"`), and the quoted form reads them as they are; their rename is a rung of its own (#296).

## Consequences

- `use "id"` warns in every text that writes it; Normalise rewrites it, and the seed performers take their instruments by name (`use &bassV from bass`). No event snapshot moves.
- `Used` gains `names`; `UseLine` (the parse's `uses`) gains `names` too.
- Shorten's measure counts a `use` line as one leaf still (054); a rule that offers the narrowest named use is #297.
- Cell studio's used cluster can draw what a use names (an issue there at the pin that carries this).
