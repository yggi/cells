# 050 · The equalities: a ladder of text rungs and sound rungs, each named once

**Date:** 2026-10-18 · **Status:** accepted (the owner on #180: "notes and events hashes is enough 'sounds identical'", "minified identy is E4 after shorten. like Normal-Form identity", and the ladder as #180 proposes it) · Issues: #180, #186, #154, #177, #49, #46

## Context

"The same" meant different things in different places, each with its own window. `sameNotes` compares the named cells' steps. `samePiece` compares every event over the first 60 s. The snapshot hashes the first 40 s. The learned layer's `canonicalText` compares texts up to renaming. A hash and the pure cell aren't built. BWV 847 runs 189 s, so neither the snapshot nor `samePiece` heard its fugue (#181). And "the same structure" had no name at all.

## Decision

Two ladders, each rung named once in the code. A rung is implied by the one above it.

**Text (E)**, in `src/engine/identity.ts`:

| rung | name | holds when | built |
|---|---|---|---|
| E0 | byte-identical | the texts are equal | `byteIdentical` |
| E1 | identical up to layout | equal once comments, whitespace and line continuations are read as one | `identicalUpToLayout` |
| E2 | identical up to renaming | E1 once each text's own names are numbered in the order it declares them (the interface names kept) | `identicalUpToRenaming` (the learned layer's `canonicalText`) |
| E3 | normal-form identical | E2 after `normalise` | `normalFormIdentical` |
| E4 | structurally identical | E3 after the identity step: stated defaults dropped (decision 049, ruling 1). What a hash reads | #49 |
| E5 | orbit identical | E4 up to the operators: a transposition, `^n`, a rotation | the pure cell, #46 |
| — | **minified identical** | E4 after Shorten, as E3 is E2 after Normalise (the owner) | with E4 and #157 |

**Sound (S)**, in `src/engine/sameness.ts`:

| rung | name | holds when | built |
|---|---|---|---|
| S1 | **sounds identical** | every event alike: voice (by its place among the voices, #186), onset, length, pitch, gains, bends, levels, moving parameters, envelope. That is the snapshot's `notes` and `events` hashes | `soundsIdentical` |
| S2 | plays the same notes | voice, onset, length and pitch alike; gains and the rest free | `playsSameNotes` |
| S3 | the same notes in named cells | the named cells' flattened steps alike | `sameNotes` |

- **The window is the whole piece** where the piece ends: the later of the two ends (`laps=`). A piece that goes on is compared over its first minute. The window is at most twenty minutes (`wholeWindow`, `WHOLE_PIECE_LIMIT`), and `until` overrides it.
- **What each promises:**
  - **Every rewriting tool promises S1** (decision 049). Normalise also keeps the structure. Shorten's output is the minified form. Fold promises nothing, since a hint is a claim.
  - **The snapshot is S1 over 40 s**, plus cell names (its `values` and `live` hashes): how a piece is *seen*, not one of the tools' promises.
  - **The repository's identity is E2 today**, and E4 once the hash is built.
- **E5 sits beside S1, not above it:** a transposed copy is the same shape and doesn't sound the same.

## Why

Each claim a pull request or a tool makes ("plays the same", "the same fragment", "more compact") now names its rung and its window. A claim with no name or window couldn't be checked. Two equalities a ladder kept apart had been one word ("the same notes"), and two rungs were missing (layout, and structure).

Rejected: one equality for everything (renaming and respelling are not the same claim as sounding alike); minified identity as an equal size (two texts of one size can be built differently; the owner: E4 after Shorten).

## Consequences

- **S1 reads a voice by its place, not its name** (#186, the owner: as recommended). An event names its voice, so S1 and S2 number the voices heard in the order the text declares them: a voice renamed sounds identical, so E2 ⇒ S1 holds for every cell; two voices' parts swapped don't; a cell added that isn't a voice moves no number. The snapshot keeps the names: its hashes witness how a piece is seen as well as heard, and no example's moves.
- **The tools move from `samePiece` (S1 over 60 s) to `soundsIdentical` (S1 over the whole window)** in a rung of their own (#154), timed against the shorten tests over every example, since pieces that end are then compared to their end.
- #177's target ratchet scores "the result plays the input" as S1 over the whole window. Its measure is decision 049's (`engine/measure`, #183).
