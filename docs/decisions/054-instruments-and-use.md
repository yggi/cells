# 054 · Instruments are fragments, and a piece uses fragments by reference: `use "gm kit"`, the piece's own lines winning; by id now, by hash with a lockfile once E4 exists

**Date:** 2026-10-21 · **Status:** accepted (owner, 2026-10-21: the four rulings as recommended) · Issues: #226, #225, #49, #81, #196, #177, #46, #149, #178, yggi/jambot#420, yggi/cell-studio#406

## Context

[Decision 047](047-fragments-are-files.md) made a fragment a piece with holes, combined with others by a union of lines, and listed `instrument` among the facets an association point may name (point 4); [decision 043](043-the-composer-selects.md) has the composer ask for instruments last, after the meter, the rhythms, the harmony and the lines.
No instrument fragment exists.
The seed library's 36 fragments are meters, rhythms, bass lines and harmony, and the rhythms bring their own stand-in voices (`&bd s=white`), so each compiles alone.
The examples write their own kits: 18 of the 78 define a voice (`s=`) under a General MIDI drum name, 49 such lines, and `&bd` is written in 17 files in 15 variants (#196, rung 4: "drums are renamed now, shared later").
`GM_DRUMS` (`src/engine/midi.ts`) names 13 of General MIDI's 47 percussion notes (35–81), by 27 names; a kit member's note is read off its name (`gmDrumNote`), and a name it doesn't know takes the next free note from 36.

A piece has no way to take a fragment by reference.
The union is a tool (`unionOf`, `fitOf`): the composer's workbench is written out, and what it took from the repository is no longer named in it.
#177's question 4 asks for dynamic references (Cell studio playing a piece as Jambot's conductor swaps its fragments), and its requirements are on #49: a reference names a fragment by identity, resolves to text before compile, binds holes by name, can be swapped while it plays, nests, and round-trips with `decompose`.
#117 measured imports by id once, as option (c), `&drums use="funk drums"` with every cell renamed into a namespace: renaming lost the drums' General MIDI notes, 78 of E33's 137, since the note is read off the voice's name.

The owner (2026-10-21): instruments (voices, kits, synth patches) become fragments, with a collection of default instruments, a full General MIDI drum kit first; a piece brings fragments in by reference.
Four questions were put, and ruled as recommended.

## Decision

### 1. Instruments are fragments

- **An instrument fragment defines voices and uses nothing** (facet `instrument`): each voice its sound in cells' own parameters (`s=`, `loop=`, `pitch=`, `env=`, filters), and, for a drum, its General MIDI note through its name (section 4).
  It fills the holes pattern fragments leave: a groove plays `&bd &sd &hh`, a kit defines them.
- **Kits are interchangeable where they define the same names.** A groove and a kit are playable; another kit with the same names plays the same groove with another timbre, and the same MIDI notes.
- **An instrument fragment defines only the names a piece plays** (no private helper cells: an envelope is written inline, `env=&(map=adsr …)`), so every name it defines is one a piece may mean to override (section 2), and none collides by accident with a piece's own helper.
- **The default instruments**, as seed fragments in `fragments/instruments/`: the **General MIDI drum kit** first, a voice for each of the 47 notes, 35–81 (`gm kit`, #225); a **core kit** beside it, the 13 voices a groove needs, the same names and lines (`core kit`); then default melodic instruments: **bass, keys, pad, lead**.

### 2. Ruling 1, the form: `use`, the piece's own lines winning

- **`use "gm kit"` is a line that brings a fragment's lines into the piece as a union**, the fragment named by its id in double quotes.
  It is a line of its own, not a cell: it has no name, no attributes and no braid.
- **The piece's own lines win.** What the compiler reads (the *expansion*) is the piece's own lines, then each used fragment's lines the piece doesn't define, in the order the `use` lines are written.
  This is open fragments' rule (047, #117): the host's lines first; here the piece is the host.
  So a piece overrides `&bd` by writing `&bd`, and every line of the kit that reads `&bd` reads the piece's.
- **A line two used fragments give word for word is one line** (047's "the same line").
  **A name two used fragments define by different lines, and the piece doesn't, is an error** naming the name and both ids: the piece writes the line itself (its own wins) or drops one `use`.
  The union of fragments (`unionOf`) renames such a name apart (`&kick2`); `use` never renames, since a renamed voice changes its drum note (#117).
- **No namespaces at first.** A qualified form (`&kit fragment("gm kit")`, `&kit.bd`) comes only if collisions bite: the error above says when they do (Open).
- **A used fragment may itself `use`.** Its own lines win over what it uses, and the piece's over all; a cycle is an error naming it, and so is a depth past 8 (a kit in a groove in a section in a piece is 3).

### 3. Ruling 2, the reference: by id now, by hash once E4 exists, with a lockfile

- **By id now.** `use "gm kit"` names the fragment's id (047's frontmatter); the seed library is versioned by cells' release tag, so a frontend's pin says which `gm kit` it has.
- **By content hash once E4 exists** (decision 050: what a hash reads, #49).
  The text keeps the id, a word (decision 037: a name is a word, a hash the identity); the hash lives beside the text.
- **A piece file's frontmatter records what each `use` resolved to: a lockfile**, so a saved piece keeps sounding the same when a library moves on:

  ```yaml
  uses:
    - id: gm kit
      hash: e1:7b0c… # illustrative; the rung of the hash before E4 is Open
  ```

  - A `use` with a recorded hash asks the resolver for that version; a library that has only another plays that one with a warning naming the id ("gm kit has changed since this piece was saved"), and the next save records it only when the person keeps it.
  - **A `use` with no recorded hash resolves to the library's current version, and the next save records it.**
    A raw text, or a file with no frontmatter (decision 051), has no lockfile: it plays the current version, always.
  - An entry no `use` names is dropped on the next save.
- **Purity: cells resolves nothing itself.** The host hands the compiler a resolver (`compile(text, { resolve })`, a function from an id, and a hash where one is recorded, to a fragment's text, or none): the seed library (cells exports one), Jambot's learned layer, Cell studio's library, later SilverBullet (047's open store).
  It is the learned layer's shape (decision 048): plain data the frontend hands each call, never stored.
- **An unresolved `use` is an error** naming the id, and the piece's other lines compile as they would without it.
- **What was used is data on the compile's result** (`CompileResult.uses`: each `use`, its id, the hash it resolved to, the names it gave and the names the piece overrode), so a frontend saves the lockfile and draws the group without parsing a message (#149's lesson).
- **In Cell studio's editor, used cells show as a group, read-only**, one group per `use`.
  Editing one writes the piece's own line, starting from the used one's text, which then overrides it; deleting that line brings the used one back.
  So the text stays the single source of truth: what is shown is derived from the text and the resolver, and every edit is a line of the text.

### 4. Ruling 3, names: Strudel's short names, with General MIDI's as aliases

- **A kit's names are Strudel's short names** (`bd`, `sd`, `hh`, `oh`, `cp`, `rim`, `cr`, `rd`, `cb`, `tb`, `sh` …: decision 027, a spelling shared with Strudel keeps its meaning), **with General MIDI's names as aliases**, as `clave` and `claves` are (#140).
  Where Strudel has a short name, General MIDI's is its alias (`cb`, alias `cowbell`); where it has none, General MIDI's is the name (`vibraslap`).
- The table that replaces `GM_DRUMS` names all 47 notes, each name and alias once; #178's Latin set folds into it.
- A General MIDI name is several words (*Low Floor Tom*), and a cell's name is one, so the kit's rung spells each as one word and names how.
  Five end in a digit (*Bass Drum 1*, *Crash Cymbal 1* and *2*, *Ride Cymbal 1* and *2*), where `gmDrumNote` reads a trailing number as a copy's (`bd2` is a kick): the rung spells them without one, or changes that rule, and says which.
- No existing name changes its note.

### 5. Ruling 4, the examples: `use` where it sounds identical, overrides where it doesn't, one sound later

- **A Shorten rule offers `use "gm kit"` where a piece's lines equal the kit's** (S1, sounds identical): the lines equal to the kit's word for word go, the rest stay as the piece's overrides, and the rule is kept only where the piece sounds identical over the whole window (decision 050).
  It offers the smallest instrument fragment that holds every equal line: the core kit before the General MIDI kit, since their lines are the same.
- **Examples whose kit differs keep their own lines as overrides**: no sound changes.
- **Unifying the examples' sounds comes later, piece by piece, by ear** (#196's "shared later"): each piece that drops an override changes how it sounds, and its pull request says so.

## What follows

- **The fit (decision 047): a used fragment's holes become the piece's.**
  A piece's holes are its own lines' holes and each used fragment's, less what the piece and the other used fragments define; a used fragment's clock needs are the piece's.
  So a piece with `use` is a fragment with holes like any other (047, point 1), and its fit on a workbench is its expansion's.
  A `use` line two fragments give word for word is the same line in their union.
- **The equalities (decision 050).** Take a piece *p* with `use "core kit"` and *q*, the same piece with the kit's lines written out where the expansion puts them.
  - **S1 holds**: the compiler reads the expansion, so *p* and *q* are the same events, voice by voice; a test witnesses it on every rhythm fragment with the core kit.
  - **No text rung from E0 to E4 holds, by design.** Normalise keeps `use` (below), so *p* and *q* differ at E3; and E4, what a hash reads, reads each `use` as the hash it resolved to (#177's requirement 5, a hash over the references, not their expansion), so pieces that use one kit share it, and a kit's change moves a piece's hash only where its lockfile moves.
  - **Minified identity holds where Shorten's rule writes the `use`**: Shorten takes *q* to *p*, and minified identity is E4 after Shorten (050).
  - S1 numbers the voices heard in the order the text declares them (#186), so the rule is offered only where the expansion keeps the piece's heard voices in their order (since [057](057-a-voice-by-its-sound.md), S1 reads a voice by its sound, and the order matters only where a MIDI card sends a kit member's name). The kit declares in General MIDI's order, 35 up; the migration's rung counts what that leaves.
- **Normalise keeps `use`; it never expands it** (recommended). Normalise keeps every cell, name, step and reference (decision 049), and `use` is a reference: expanding adds cells, a change of structure, Shorten's side of 049's line.
  It spells the line one way (`use "id"`, double quotes, one per line) and keeps the order of the `use` lines.
  The expansion is a function of its own (`expand(text, resolve)`, #177's `inline`): what the compiler reads, and Cell studio's "write out".
- **Shorten's measure** (049, ruling 2) counts a `use` line as one leaf, a reference, and the used fragment's lines nowhere in the piece: they are the library's.
  So the rule saves structure wherever it removes a line, and an override line equal to the used fragment's is a line Shorten offers to remove.
- **The built-in card (decision 028) hears what the piece's own lines leave unread, not a used fragment's** (ruled, as recommended).
  A piece with no card that uses the General MIDI kit would otherwise hear 47 voices held; a used fragment that should sound brings its card, as the seed's rhythms and bass lines did, or the piece reads its lines.
  *Amended (#291, 2026-10-26):* the pattern fragments carry no card; where their notes go is the workbench's and the performer's (decision 058), so the piece reads their lines (a drum bar's `&groove`, a bass line's `&bassline`).
- **MIDI out is unchanged**: a kit's notes are its members' (`kitNotes`), the voices a kit or a mix reads, so a used voice nothing plays sends nothing.

## The forms, as this decision would have them

None of these is built: `use` is rung 3, the kits are #225, a rhythm fragment without its stand-in voices is rung 2.

The core kit, a fragment that defines voices and uses nothing (its sounds a first pass, taken from the examples' most common lines):

```cells
# fragments/instruments/core-kit.md: id "core kit", facet instrument
&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)
&rim s=sine loop=E5 env=&(map=adsr 0 .03 0 .02)
&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)
&cp oneshot s=white hpf=1300 env=&(map=adsr 0 .14 0 .06)
&hh oneshot s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&oh oneshot s=white hpf=7000 env=&(map=adsr 0 .18 0 .08)
# … one line per name: 13 in the core kit, 47 in the General MIDI kit
```

A groove and a kit: the piece writes its meter and its card, and the rest is used.
Swapping `"core kit"` for another kit with the same names (none exists yet) changes the timbre and keeps every note:

```cells
use "Funk drums"
use "core kit"
&bar meter("4/4") step=100bpm
&out map=sample postgain=.8 [&kick, &backbeat, &fill, &ghost, &hat]
```

A piece that overrides one voice of the kit by writing it:

```cells
use "core kit"
&bar scan(1 1 1 1) step=free(moderato)
&beat &bd ~ &hh:0:.5 ~ &sd ~ &hh:0:.5 [&bd,&hh]
&groove step=8n &beat
# the piece's own snare: it wins over the kit's
&sd s=white hpf=900 distort=.6 env=&(map=adsr 0 .12 0 .05)
&out map=sample postgain=.944 [&groove * .6]
```

What the compiler reads for it, the expansion: the piece's own lines first, then the kit's lines it doesn't override (here the kit's `&sd` is left out, and `&bd` and `&hh` come from the kit):

```cells
&bar scan(1 1 1 1) step=free(moderato)
&beat &bd ~ &hh:0:.5 ~ &sd ~ &hh:0:.5 [&bd,&hh]
&groove step=8n &beat
&sd s=white hpf=900 distort=.6 env=&(map=adsr 0 .12 0 .05)
&out map=sample postgain=.944 [&groove * .6]
&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)
&rim s=sine loop=E5 env=&(map=adsr 0 .03 0 .02)
&cp oneshot s=white hpf=1300 env=&(map=adsr 0 .14 0 .06)
&hh oneshot s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&oh oneshot s=white hpf=7000 env=&(map=adsr 0 .18 0 .08)
# … the kit's other voices
```

## Why

- **A reference in the text**, because a kit written once is shared: a library's better kick reaches every piece that doesn't pin the old one, and Cell studio can follow a piece whose fragments a conductor swaps (#177) only if the piece names them.
- **The piece's lines win**, because overriding then needs no form: the author writes the line, as the host's lines come first for an open fragment (047, #117). A piece written out and a piece that uses are read by one rule.
- **No namespaces**, because the drum note is read off the voice's name: renaming into a namespace lost 78 of 137 notes in #117. A collision is an error, never silent, so the form waits until one is met.
- **The id in the text and the hash in the frontmatter**, so the text stays legible (a name is a word, 037) and a library's update is a change to the lockfile, not to the code.
- **A resolver handed in**, because cells is pure (`tsconfig.pure.json`: no I/O) and stateless (decision 048): what a library holds is the frontend's.

**Why not** imports as a cell's attribute, `&drums use="funk drums"` (#117's (c)): it names a namespace cell, which renames the voices, and a line of a fragment is not a cell's value.
**Why not** writing the fragment out on save, with no reference kept: the piece loses its link, a library's improvement never reaches it, and a live client can't follow it.
**Why not** the union's renaming for `use`: two used fragments that both define `&bd` mean the same drum, and `&bd2` would send another note.
**Why not** a reference by hash in the text (`use #7b0c…`): unreadable, and the code would change whenever the library does.

## Settled after (owner, 2026-10-21: each as recommended)

Each was open in the draft with a recommendation; the owner ruled every one as recommended, and the two gaps the draft found with them (the built-in card in *What follows*, the fit's voice holes below).

- **The hash's exact quotient** (#46): E4, or E5, the orbit under the operators?
  Ruled, as recommended: a lockfile pins E4, since it pins what sounds and an orbit doesn't sound alike (E5 sits beside S1, decision 050); orbit identity is the repository's, for recognition (#224).
- **The lockfile's hash before E4 exists.**
  Ruled, as recommended: the hash of the text up to layout (E1), recorded with its rung (`e1:…`), so a lockfile written before E4 still checks after it (E4 follows from E1), and the next save records `e4:…`.
- **Where a library's older versions live**, so a lockfile's hash resolves after the library moves on.
  Ruled, as recommended: the seed library keeps each version a release shipped, by hash, in a generated table (a kit changes seldom); a frontend keeps what its pieces' lockfiles name.
- **Qualified names** (`&kit fragment("gm kit")`, `&kit.bd`).
  Ruled, as recommended: only after the collision error has fired in a real piece or a composer's workbench, and only in a form that keeps a voice's drum note (`&kit.bd` reads `bd`).
- **`use` of a learned or a person's fragment across devices**: its id (`composer 2026-10-18T21:04:00Z`, 048) lives in one frontend's layer, so another device's resolver may not hold it.
  Ruled, as recommended: until 047's store serves fragments by hash, a save that leaves a `use` only this device resolves offers to write it out (the expansion).
- **Version ranges** (`use "gm kit" ^1`).
  Ruled, as recommended: none. A `use` follows the current version until a save pins it, and moving the pin is a person's act; fragments have no versions of their own to range over.
- **The fit's voice holes.** Once a rhythm fragment's stand-in voices go (rung 2), its `&bd` is a hole, and 043 asks for the instruments after the rhythms, so the fit would refuse every groove on a workbench with no kit yet.
  Ruled, as recommended: a hole read only as a sound (played through a mix or a kit, never a table or a clock) doesn't block the fit, and the composer asks for the instrument next.
- **A used fragment swapped while it plays** (#177's requirement 4).
  Ruled, as recommended: the host re-resolves the `use` and recompiles at a section's boundary, the clocks kept as a tempo change keeps the beat (#56); the language adds nothing until a live client needs more.

## Rungs

Each is a pull request, or an issue when it starts; each states its bound as a number.

1. **The General MIDI kit and the core kit as seed fragments** (#225): 47 of 47 notes (35–81) named, each name and alias once, each sounding on its own note over MIDI out; the core kit's 13 voices, the same lines; both compile with no diagnostic and use no name; no example's event snapshot moves and no name's note moves. #178 closes with it, or names what's left.
2. **The pattern fragments' voices become holes** (built in #244; owner, 2026-10-22: "drop the stand-ins where they are just placeholders, and use instrument fragments where they are truly different"): the 30 `&bd s=white …` stand-ins of the eight drum bars (bare white noise, one sound for a kick and a hat), the five claves' `&claves` (the core kit's line word for word) and the bell and scale's `&highagogo` (the General MIDI kit's) go: 36 lines of the rhythms and the bell; the five bass lines' `&bassV loop=C2`, which sets the register and so the MIDI notes, becomes the first of rung 7, a `bass` instrument fragment that defines `&bassV loop=C2`, and the lines drop theirs. Each still plays the same notes and drum notes through a kit (S2 by General MIDI note, the MIDI out unchanged); **S1 is not kept for the drums**, which now sound as the kit's voices. A fragment with holes no longer compiles alone, so a frontend's text brings the instruments (`use "core kit"`, `use "bass"`); holes read #149's data, and `holesOf` stands each sound hole in by a voice and asks the compile again, for it names one unknown cell a line.
3. **`use`, with a resolver and the lockfile**: the line in the parser, `compile(text, { resolve })`, `CompileResult.uses`, `expand`, the seed library's resolver, `uses:` in a piece file's frontmatter (written by `writePiece`), a page in `docs/language/`, decision 028's exception for the built-in card.
   Bounds: no example's or fragment's event snapshot moves; each of the 13 rhythm fragments with `use "core kit"`, on a workbench whose meter it fits, sounds identical (S1, the whole window) to the same text written out; an unresolved `use`, a cycle, a depth past 8 and a collision between two used fragments are each an error with a test; a piece using the General MIDI kit compiles within 5 ms of the same piece written out (the median of 20 runs).
4. **The Shorten rule, and the examples' migration, sounds identical first**: the rule as section 5 says, over every example; the rung counts how many examples' kit lines equal the kit's exactly once the kit exists, and names the number.
   A probe today (not committed): of the 49 voice lines under a kit name in 18 examples, no line is written alike in more than 3 files (`&hh`); a kit whose `&bd`, `&sd`, `&hh` and `&rim` were the examples' most common lines would equal 13 of the 49, in 8 examples, so most examples keep overrides.
   No example's `notes` or `events` hash moves (its `values` and `live` may: cells go).
5. **Cell studio's editor shows used cells** (an issue there at the pin that carries rung 3): a group per `use`, read-only; an edit of a used cell adds exactly one line to the text, and deleting it restores the used one; an example migrated in rung 4 draws the same cells as before it.
6. **Jambot's presets' sounds as instrument fragments** (yggi/jambot#420, rung 4): each preset's sounds a fragment found under the facet `instrument`; E31's 8 drum bars play through `use` with each preset's kit, and the band's MIDI out doesn't move.
7. **The default melodic instruments**: bass, keys, pad and lead, 4 seed fragments, the voice names the line fragments play through chosen and named, as the kit's are.

## Consequences

- Nothing changes in `src/` with this record; each rung brings its `CHANGELOG.md` line (`use` under *Added* in rung 3).
- Decision 047's union stays how fragments combine on a workbench, a private collision renamed apart; `use` is how a piece takes one, its own lines winning: the difference is that a piece has an author, and two fragments side by side don't.
- `docs/language/midi.md`'s list of drum names moves to the kit's table in rung 1; `GM_DRUMS` becomes it.
- #196's rung 4 has its parts: the kit (#225), `use` (rung 3) and the rule (rung 4).
