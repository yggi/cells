# 049 · Four tools over a piece: Migrate, Normalise, Shorten, Fold

**Date:** 2026-10-18 · **Status:** proposed (the four definitions are the owner's, 2026-10-18; the lines between the tools, the sort of today's rules and the questions below are the proposal) · Issues: #154 (the epic), #161 (the shared layer, built), #155, #156, #28, #157, #158, #27, #35 · Supersedes [decision 017](017-shorten-and-normalise.md) in part

## Context

Decision 017 split the work on a piece's text in two: Shorten suggests (what is shorter, and migrations), Normalise converges. Shorten has since grown to 14 rules (`src/engine/shorten/`) doing three different jobs, measured in characters, and holding what every tool shares (the note-for-note check, `shorten/harness.ts`). The folder (`src/engine/fold/`) grew beside it as a pipeline of its own from notes to cells, finding structure and printing it.

The owner (2026-10-18):
- "migrate (new) should rewrite previously valid forms into currently valid forms."
- "normalise should rewrite various **valid** forms into a **canonical** form."
- "shorten should make a valid form more **compact**, not necessarily shorter by text-length, but by structure. more cells with *shortened* braids conceptually."
- "fold is complementary to shorten. shorten works on the syntax-level (source), fold works on the structure-level (output). (shorten knows how to rewrite, but it does not really know where to look; fold does not know how to rewrite, but it finds repetitive or permutated structures, hinting shorten where to look.)" The workflow: running through a MIDI file, Fold finds the sections and other structures, hints Shorten ("this seems to be a 100 BPM 4/4 piece consisting of 5 sections of 32 bars"), and Shorten uses the hints to take the MIDI apart.

## Decision

| tool | reads | writes | promises | judged by | never |
|---|---|---|---|---|---|
| **Migrate** | a text valid in an earlier version of the language | the same piece, valid now: no warning naming a retired form | the notes it played in the version it was written for | nothing: whatever length | touches a form valid now |
| **Normalise** | a valid text | its canonical spelling ([#27](https://github.com/yggi/cells/issues/27)'s table) | the same notes; **every cell, its name, every step and every reference kept** | idempotence | changes the structure; is offered while a piece is being written (017) |
| **Shorten** | a valid text, and hints if there are any | a more compact structure: more cells, shorter braids | the same notes | the structure saved, measured over the normal form | respells into a house style (Normalise's) or migrates (Migrate's) |
| **Fold** | events (any loader's: a MIDI file, a cells piece's own) | hints: what it finds and where | nothing: a hint is a claim | — | writes text |

- **The line between Normalise and Shorten is the structure:** the cells, their names, the steps their braids write and the references between them. Normalise changes only how these are spelled; Shorten changes them. So Normalise is safe for the author's piece, the round trip and a hash, and Shorten is where structure is found.
- **Shorten's measure is structure, taken over the normal form**, so a respelling never counts as compaction and a long name costs nothing. The proposal (question 2): each leaf the parser reads from a braid (a number, a rest, a reference; a chord its entries; `x!n` and `x@n` one leaf), plus one for each cell.
- **A hint** (`src/engine/fold/hints.ts`, #158) says where (a line, a span of its events in steps and seconds) and what Fold claims is there: a meter and a tempo, sections and which are alike, a span repeated under a transform (the same, transposed, at another speed, reversed, inverted, rotated), voices, key areas. Shorten turns a hint into rewrites it knows and keeps each only if the piece plays the same (`samePiece`): a wrong hint costs time, never notes. With no hints, Shorten looks in the text itself.
- **The order:** Migrate, then Normalise; Fold over the events, then Shorten on its hints; Normalise last. A MIDI file's conversion runs it from the flat text the reader writes. An old piece opened runs Migrate. The editor offers Shorten's suggestions and Migrate's; Normalise is a command (`npm run normalise`), the examples' and the fragments' check, and the step before a hash (#49).
- **What every tool shares** is one layer (#155): a `Rewrite` (id, tool, rule, title, before, after, apply), the note-for-note check (`src/engine/sameness.ts`), and a driver that applies a tool's rules until none applies.
- **A retired form keeps being read until a decision of its own removes it**, and its migration keeps a witness that outlives the parser reading it: pairs in `fixtures/migrations/`, the before and the after (#156).

### Today's rules, sorted

| rule (`src/engine/shorten/`) | tool | why |
|---|---|---|
| `gates` (decision 023), `taps` (040), `swing` (#18), `card` (047: a card's `title=` `tags=` `tier=` as the piece file's frontmatter) | Migrate | a retired form, still read |
| `aliases` (027), `clip=` → `legato=` (#94, not built) | Normalise | the parser reads both as one |
| `defaults` (Fs5 and the boilerplate of yggi/cell-studio#171) | Normalise | an attribute that says what is so anyway: no cell or step changes |
| `runs` (`0 0 0 0` → `0!4`, F11), `fractions` (`4@2 2@2 0@4` → `4 2 0@2` on a clock half as fast), `progressions` (a transposer's `loop=&bar/48` → `step=&bar/4`, F2) | Normalise, when #27 rules their rows | the same steps, spelled otherwise; Shorten keeps them until then |
| `phrases`, `same`, `wrappers`, `stereo` | Shorten | each changes the cells or the steps (`stereo`: two chords on the card that differ only in gains as one, and `pan=`) |
| `sections` (`&parts` → `&sections`, 044) | Migrate, for one minor version, then retired | `&parts` is a valid name, not a retired form: a one-off move of the examples' convention, now done (#153); the owner's ruling on question 4 |

The folder's finders (keys, sections by key, voices; the repeats `pairs`, `figure`, `variants`, `dilate` and `stretch` find) and `src/engine/time/` (`boundaries`, `motifs`, `necklace`) are Fold's. Its writers (`print.ts`, β, its judge by printed characters) are Shorten's work done the folder's way: each retires when Shorten on hints folds every MIDI set at least as well (the ratchets).

## Why

- **Four promises, four tools.** Migrate's promise is to the past (what a piece played when it was written), Normalise's to the corpus (one spelling per meaning, invariant I2), Shorten's to the author (a more compact piece of their own), Fold's to nobody: it only looks. Mixed in one tool, each rule had to say which it was, and the measure (characters) served none of them well: a migration is often longer, a canonical spelling sometimes, and a phrase named `&chorus` lost to one named `&a`.
- **Keeping the structure is what makes Normalise safe.** Decision 017 feared a normal form that "overrides authors' structure and names"; a Normalise that keeps every cell, name, step and reference can't.
- **Finding and writing are different skills.** The folder's own search reaches 19 cells for the Minuet in F in 694 moves (`docs/notes/conversion.md`), most of them taken back, because it finds and prints in one loop. Fold looking at the events, where repetition and permutation show whatever the text's spelling, and Shorten writing on the text, where the language's forms are, let each be measured on its own: Fold by how close its hints are to what an analyst finds (#38, #43), Shorten by the structure saved.

Rejected: Migrate inside Normalise (a retired form is not a valid one, and a piece saved under an old version needs Migrate on its own, without being normalised); Shorten keeping characters as its measure (it rewards short names over structure); the folder kept as a writer of its own (two writers of structure, each with its own judge, drift apart).

## Consequences

- Decision 017 stands for Normalise ("converges, as a command of its own"; "never offered while a piece is being written"; its list in one place, `docs/language/`), and for the editor writing the plainest form. Its "Migrations belong to both" is superseded: they are Migrate's. Its "Shorten offers what is shorter" now means shorter by structure.
- `AGENTS.md`'s "Shorten writes migrations" becomes "Migrate writes migrations" when Migrate is built (#156).
- `Suggestion` keeps its shape. A kind Shorten stops offering keeps coming for one minor version, delegated to its new tool, and goes with a `CHANGELOG.md` line, so a frontend's next pin doesn't break. `Suggestion.saving` becomes the structure saved (#157).
- `docs/notes/fold.md`'s architecture (a reader, tools, a printer, a judge) changes: the reader and the tools stay the folder's, the printer and the judge become Shorten's (#158). Its ratchets guard the move.
- #27's rows split: a **spelling row** joins Normalise; a **structure row** (F8 a drum hit, F15 inline or named, F19 a gate against a product) is Shorten's preference, not a canonical spelling. Identity beyond spelling, two structures of one piece hashing alike, is the pure cell's (#46).

- **The tools meet the repository** (#159): Normalise's output is the canonical form the hash (#49) and the learned layer's identity (decision 048) read; Fold → Shorten → Normalise is how what the Muse hears becomes a filed fragment (decision 047, `source: muse`); and Shorten's cells are a fragment's natural size, so Shorten's measure (question 2) and decision 047's "a piece with holes" agree on that unit.

## Questions for the owner

1. **The line:** Normalise keeps every cell, its name, every step and every reference; Shorten changes them. Accepted?
2. **Shorten's measure:** each leaf a braid writes (`x!n` and `x@n` one leaf, a chord its entries) plus one for each cell, over the normal form, names and comments free. Or other weights (an attribute's value, a reference costing more than a number)?
3. **`clip=`: ruled.** "clip warns, normalize will rewrite it to legato" (owner, 2026-10-17, on the legato work; built in #105). `clip=` → `legato=` is a Normalise rule, and its warning stays until Normalise offers it.
4. **`&parts` → `&sections`: ruled** (#159). Neither a migration (the old name stays valid) nor a normalisation (names are the author's): a one-off move of the examples' convention, done (#153). Migrate offers it for one minor version, then it is retired with a `CHANGELOG.md` line, as a kind Shorten stops offering is.
5. **The folder stops writing text:** its printer and β become Shorten's on hints, each retired only when the ratchets hold without it. Accepted as the direction?
6. **A retired form:** kept in the parser until a decision of its own, its migration witnessed by fixture pairs from then on. Or a fixed term (read until 1.0, say)?
