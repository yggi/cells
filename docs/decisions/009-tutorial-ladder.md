# 009 · The tutorial: a ladder of pieces, `rung=` on the card, its own cell in the library

**Date:** 2026-10-07 · **Status:** accepted (owner, #170)

## Decision

- **The tutorial is a ladder of pieces.** Each rung introduces one concept and uses only what the rungs before it introduced; together the rungs cover every form of the [syntax reference](../language/reference.md), each form on exactly one rung. The rungs are the list proposed on #170, with the owner's approval.
- **A rung's place is written on its card:** `rung=n`, a display attribute like `level=` (not a list in the code). Only a card takes it.
- **`tutorial` is a kind of tag**, as `genre:` and `artist:` are, and its only tag. It replaces the topic `basics`; a saved piece's `basics` is read as `tutorial`.
- **The tutorial is a cell of its own in the library**, beside the wheel of pieces: its pieces leave the wheel and sit in rows in their order, a thread through them; in the cards view it is a section first, rung by rung; in the header's path, `tutorial › tutorial › n. …` steps through it.
- **The ladder is checked by a test** (`engine/ladder.test.ts`): `LADDER` in `engine/ladder.ts` lists the forms each rung introduces, `formsUsed` reads which forms a piece uses from what it parses to, and the test fails on a form used before its rung, a rung that doesn't use all of its own, or a reference form on no rung.

## Why

Fifteen pieces carried `basics` but formed no path: several taught three or four things at once, many concepts had no basic, and basics used what none had taught yet ([notes/10-corpus.md](../notes/10-corpus.md), *The basics*). A ladder makes the order the point; on the card, the order travels with the piece and needs no second place to keep in step. A kind of tag (rather than a topic) lets the library treat the tutorial as one thing, as it treats the genres. Checking the forms by a test keeps the ladder honest as the language grows: a new form in the reference fails the test until a rung teaches it.

## Consequences

- Covering every form needs a few pieces a full piece would never be: a tutorial piece may write a parameter at its default when that is the lesson (Automaton's `damping=3`, Kalimba's `board=box`).
- Pieces that read better as pieces (Bell and scale, Just intonation, Two Tuning Forks, Alpha) lost `basics` and stay in the wheel.
- Changing the reference (a new form, a renamed one) means changing `LADDER` and the rung that teaches it in the same PR.
- The operator pass (#10) will change spellings the rungs teach (`degree()`, `inverse()`); the ladder test follows the reference, so it says which rungs to rewrite.
