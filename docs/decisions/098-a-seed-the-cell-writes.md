# 098 · A seed the cell writes: a chancy cell draws from the seed it carries, no edit to what it carries throws the dice again

**Date:** 2026-11-23 · **Status:** accepted (the owner on #779, 2026-11-22 and 2026-11-23: "I tend to 2c", then "as suggested A, and seed replaces content key")

*Read with [031](031-chance-keyed-on-time.md) (chance is keyed on the cell, the lap and the step; amended by #481 to key on what a cell plays), [050](050-the-equalities.md) (S1, the same sounds) and the laws L1, L7 and L12 ([laws.md](../language/laws.md)).*

## Context

A draw is thrown per seed, cell, lap and step. Its cell's key hashed every attribute the cell carries, `chance=` aside, so a `role=`, a `part=` or a label, which no listener hears, threw the dice again: writing `role=hat` on the Electro swing `&ticks` moved its example from 768 notes to 763 (#773), and splitting its snare ghost into a line of its own to 764 (#715). The dice are the piece's, not a line's metadata's. `seed=n` existed, but it was mixed into the content key, so it picked a sequence without making the draws stable.

## Decision

1. **A cell that writes a `seed=` draws from it alone.** Its draws are keyed on that seed, lap and step, never on what the cell carries: any edit to its steps, parameters, role, part or label leaves them as they were, and a different number throws them again. A cell that writes none is keyed on what it plays, as before (031, #481). A cell that reads a seeded cell (a parameter that names it) reads it as that seed.
2. **Normalise writes it, and writes the dice it threw.** On every chancy cell (a chance, a choice or a pick among its steps) that writes no seed, Normalise writes `seed=n`, `n` the cell's content key as a number, so the draws are the very ones thrown before: the rewrite plays the same by construction (S1). The Electro swing `&ticks`, the `sh` module and every chancy line of the examples carry theirs, and no example moved but one (below).
3. **A written seed is any whole number.** A seed `n` is thrown as the key `n` in base 36 under the default seed 0, which is how Normalise's number reproduces the dice. A seed written by hand, `seed=3`, is a different number and throws different dice than the cell threw before.
4. **Cells that write the same seed draw alike,** as two that played alike did. A fragment taken twice with different arguments keeps its one seed: its dice no longer follow its arguments. A frontend that writes a chancy line of its own writes a seed or leaves it to the content key.
5. **A seed is part of the text a fragment's hash reads,** and a fragment of the library written with one changes its hash once.

## Consequences

- L7 (chance is reproducible) gains a clause: under any edit that doesn't change what a cell plays, and a seeded cell's dice stay under any edit to what it carries. L1 holds: a seed is an attribute's value, never a name.
- **What moved:** only the `chance` example (451 notes, now 442), whose `&ghosts` wrote `seed=3`, which was mixed with its content and is now the seed alone. No other example, no seed fragment's notes moved (`snapshot.txt`).
- **The test:** a role, a part and a label on every chancy cell of every example and every fragment of the library move 0 events, and shown firing with the seeds taken off.
