# 037 · The handshake with Jambot: who owns what, the word map, the syntax in flight, a fragment's style

**Date:** 2026-10-14 · **Status:** accepted (owner, on [yggi/jambot#309](https://github.com/yggi/jambot/issues/309): D2 to D6 as suggested; D1, three repositories, before it) · Issues: yggi/jambot#309, yggi/cell-studio#406, #1

## Context

Cell studio began as a spike out of Jambot, to research and define the language. For eternal jam sessions, the two come back together around the cells language: Jambot composes, writing cells text a section at a time; the cells engine plays it; the Muse writes cell fragments to a shared repository.
The two had grown their own words for the same things, and some of the same words for different things, so the handshake ruled which side owns each part and each word.
The rulings about Jambot's own code stay on #309. The ones that bind the language are recorded here, since this repository holds the language.

## Decision

**Who owns what (D2).**

| Part | Owner |
|---|---|
| The language: parser, compiler, realize, Shorten, Normalise, the folder | cells |
| The repository of fragments: format, canonical form, hash, index, queries | cells |
| MIDI in and out, its clock, the keys and pads | one shared copy, merged from the two there are (Cell studio lifted Jambot's at 8cdb6b8); where it lives is settled when it is merged |
| The composer, the style space, sessions and the lobby | Jambot |
| The Muse | hearing in Jambot (the phrase reader, confidence, recognition); writing in cells (the capture law, the folder) |
| The theory primitive (Jambot's `even`, the helix) against cells' tables and `scan()` | one under both, spelled in cells; it moves into cells when the seam needs it |
| The editor, the graph, the layout, the audio | Cell studio |

**The word map (D3).** Cells' spelling wins where it agrees with Strudel; Jambot's meaning wins where the question is about meaning.

| Question | Ruling |
|---|---|
| Euclid's rotation | cells in the text (Strudel's Bjorklund, decision 027), Jambot's `even` underneath: `euclid(k, n, r)` is `even(k, n, r + offset(k, n))`, the offsets measured in [music-commons' Euclid contract](https://github.com/yggi/music-commons/tree/main/contracts/euclid) |
| `_` | cells': it holds the note before |
| `^` | cells': `^n` moves n degrees, `^$n` n grid steps |
| `shift` | one name per meaning (transposing, walking the modes), settled together with Jambot; open |
| `cycle=`, `grid=` | settled with the meter tree; open |
| A cell's name | a word; a hash is the identity |
| What a cell holds | chromatic behind the hash, degrees in the text |
| Accent grades | cells': `* + .` |
| Swing | settled with the meter tree; open |
| Loudness | open: Jambot adds offsets, cells multiplies |
| Score and playing | Jambot's, for the jam's stream: the text holds what is composed, and the playing (timing, dynamics) is the player's |

**The syntax in flight (D5).** Jambot's issues on its score syntax (yggi/jambot#287 the pure cell, #306 the meter tree, #275 the tree of splits, #265 the lead as cells and operators) stop growing a spelling of their own. What they mean becomes what cells has to say, as issues and decisions here.

**A fragment's style (D6).** A fragment in the repository carries a partial style reading, with a confidence per axis and without `bpm` and `entropy`: tempo and entropy belong to the jam, not to the fragment. Whether `entropy` also leaves the jam's style vector, to become the loop's temperature, is yggi/jambot#237's question.

## Consequences

- The rows marked open stay open until their thread settles them (the meter tree for `cycle=`, `grid=` and swing); each settles as a decision here.
- The repository of fragments is specified here, with D6's style reading in its index entry.
- Jambot's own score language stops at what it has; its next spellings come from cells (yggi/jambot#309, the seam).
