# 098 · A seed the cell writes: a chancy cell draws from the seed it carries, no edit to what it carries throws the dice again

**Date:** 2026-11-23 · **Status:** accepted; items 2, 3 and 6 amended by #945 (below) (the owner on #779, 2026-11-22 and 2026-11-23: "I tend to 2c", then "as suggested A, and seed replaces content key")

*Read with [031](031-chance-keyed-on-time.md) (chance is keyed on the cell, the lap and the step; amended by #481 to key on what a cell plays), [050](050-the-equalities.md) (S1, the same sounds) and the laws L1, L7 and L12 ([laws.md](../language/laws.md)).*

## Context

A draw is thrown per seed, cell, lap and step. Its cell's key hashed every attribute the cell carries, `chance=` aside, so a `role=`, a `part=` or a label, which no listener hears, threw the dice again: writing `role=hat` on the Electro swing `&ticks` moved its example from 768 notes to 763 (#773), and splitting its snare ghost into a line of its own to 764 (#715). The dice are the piece's, not a line's metadata's. `seed=n` existed, but it was mixed into the content key, so it picked a sequence without making the draws stable.

## Decision

1. **A cell that writes a `seed=` draws from it alone.** Its draws are keyed on that seed, lap and step, never on what the cell carries: any edit to its steps, parameters, role, part or label leaves them as they were, and a different number throws them again. A cell that writes none is keyed on what it plays, as before (031, #481). A cell that reads a seeded cell (a parameter that names it) reads it as that seed.
2. **Normalise writes it, and writes the dice it threw.** On every chancy cell (a chance, a choice or a pick among its steps) that writes no seed, Normalise writes `seed=n`, `n` the cell's content key as a number, so the draws are the very ones thrown before: the rewrite plays the same by construction (S1). The Electro swing `&ticks`, the `sh` module and every chancy line of the examples carry theirs, and no example moved but one (below).
3. **A written seed is any whole number.** A seed `n` is thrown as the key `n` in base 36 under the default seed 0, which is how Normalise's number reproduces the dice. A seed written by hand, `seed=3`, is a different number and throws different dice than the cell threw before.
4. **Cells that write the same seed draw alike,** as two that played alike did. A fragment taken twice with different arguments keeps its one seed: its dice no longer follow its arguments. A frontend that writes a chancy line of its own writes a seed or leaves it to the content key.
5. **A seed is part of the text a fragment's hash reads,** and a fragment of the library written with one changes its hash once.

6. **A noise voice's grains are thrown from its seed too** (#932, the owner: "(b) is good", 2026-11-24). A voice of `s=white`, `pink` or `brown` that writes `seed=n` throws where each note starts in its noise from `n` alone, as the place `noise#n`; one that writes none is thrown from its place among the noise voices, as before (#481). Normalise writes `seed=<i>`, the place a voice has, so no sample moves; a voice added above one that wrote its own number takes the first number no voice uses, so no two noise voices throw alike (two that did would sum to one louder noise, not blend). A voice from a fragment (the General MIDI kit's) is not in the text Normalise writes: it stays thrown from its place, which an edit that adds a noise voice above it shifts.

## Consequences

- L7 (chance is reproducible) gains a clause: under any edit that doesn't change what a cell plays, and a seeded cell's dice stay under any edit to what it carries. L1 holds: a seed is an attribute's value, never a name.
- **What moved:** only the `chance` example (451 notes, now 442), whose `&ghosts` wrote `seed=3`, which was mixed with its content and is now the seed alone. No other example, no seed fragment's notes moved (`snapshot.txt`).
- **Noise:** the own noise voices of 26 examples (45 lines) carry a seed (the tutorial's three below tier 5, `voice`, `drums` and `rhythm`, stay unseeded: the ladder teaches `seed` at tier 5, and they stay thrown from their places); no sample moves (10 examples rendered 6 s at 8 kHz before and after, equal, and every voice's grain key equal over the 40 examples with a noise voice), and an edit that adds a noise voice leaves theirs.
- **The test:** a role, a part and a label on every chancy cell of every example and every fragment of the library move 0 events, and shown firing with the seeds taken off.

## Amended (#945, the owner 2026-11-24: "the structural identity hash of the canonical, desugared form is the right track")

A seed pinned what a cell's identity moved with: a `role=` or a `label=` threw the dice again. The remedy is the identity, not the pin.

- **A cell's identity leaves out what no listener hears.** `label=` `show=` `size=` `about=` `tags=` and `part=` `role=` are one list (`NOT_HEARD`, `attributes.ts`), read by a cell's draw key, by the core (`toCore` cuts them, but a `map=role` cell's own, its interface), and by the measure of structure (free). So a cell throws the dice it threw whatever it is labelled, shown, tagged or played as: 0 of the 96 unseeded examples move, and no seed is needed for it.
- **Item 2 is withdrawn: Normalise writes no seed.** Its second phase (400 rounds), `seeds.ts` and the three `kept.ts` exceptions (`voice`, `drums`, `rhythm`) are gone. Seeds already written stay, as pins (items 1, 3, 4): a hand-written `seed=n` is the way to keep a cell's dice under an edit to what it *plays*, which changes its identity by design.
- **Item 6 changed: a noise voice that writes no seed is thrown from its identity**, `noise#<its draw key>`, not from its place among the noise voices, so a voice added above, a line moved or a voice renamed moves no grain. Voices that are alike would stack (two of one noise sum to one louder, not blend): the k-th of them (k ≥ 1, in the compile's order, the voices being alike whichever is which) takes the key hashed with k, so none throws alike, whatever the order of the lines. Which of two identical voices is which may switch between compiles of an edited text; both sound alike, so it is heard as nothing. A voice that writes a seed throws from it alone, as before. The General MIDI kit's noise voices are thrown from their identity too.
- **A change to what is heard changes the identity, and so the draws and grains of an unseeded cell**: accepted, semi-intentional (an edit to a cell's sound or steps is a different cell).

What it moves: no event (the examples' snapshot is unchanged); the grains of the unseeded noise voices (the tutorial's `voice`, `drums`, `rhythm`, the library's, the GM kit's), a render's samples with them.
