# 020 · The tutorial is nine stable tiers, not thirty numbered rungs

**Date:** 2026-10-10 · **Status:** accepted (owner's request) · supersedes the rungs of [009](009-tutorial-ladder.md)

## Decision

- **The rungs collapse into eight tiers**, consecutive runs of the old rungs, so every old piece keeps its prerequisites: 1 Steps and sound · 2 Time and voice · 3 Melody and harmony · 4 Rhythm and feel · 5 Development · 6 Sound and tuning · 7 Physics · 8 Tape, text and time. A ninth was added at the end for what came after (the gate, a braid left to the performer, the MIDI card): 9 Gates, performing and MIDI. A tier is added at the end, never between. `TIERS` in `engine/ladder.ts` lists each tier's forms.
- **`tier=n` replaces `rung=n` on the card.** A piece has a tier and no number of its own; the order within a tier is the library's (`ORDER`).
- **A tier's pieces together show all of its forms** (the old rule was one piece per concept, showing all of it). A piece may use the forms of its tier and of the tiers before it, not later ones. The test checks both, and that each form is on exactly one tier.
- **A variation is a new file** in the tier, listed in `ORDER` where it reads best: no renumbering, no card changes. A new tier goes at the end.
- **The lowest tier has the smallest pieces**: *A tone* (a melody of one note, a voice, the sound card), *Rests, holds and repeats*, *Semitones*, *Two voices*, then *Steps*.

## Why

Thirty rungs made every insertion a renumbering of all the cards after it, and one piece per concept left no room for a second, smaller way in. Tiers keep the idea of an order (nothing is used before it is taught) and give the numbers a place that does not move.

## Consequences

- `rung=` is no longer read: a saved piece with `rung=` has an unknown attribute. Only cards of the tutorial carried it, and the examples were rewritten.
- The shortest sounding piece is still three cells. `&sound map=sample loop=A4` alone (a voice on the card, no melody) is an error today: the sound card takes a mix, and a voice needs a melody before it. A voice that sounds without being connected is an open question in [notes/multiscale.md](../notes/multiscale.md); it would change what saved pieces play, so it is not part of this decision.
