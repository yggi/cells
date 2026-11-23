### Added

- **A seed the cell writes: a chancy cell that writes `seed=n` draws from it alone** (#779, decision 098): no edit to what the cell carries, a `role=`, a `part=`, a label or its steps, throws its dice again, and a different number does. Normalise writes `seed=n` on every chancy cell (a chance, a choice or a pick among its steps), `n` its content key as a number, so the draws are the ones thrown before: the rewrite plays the same by construction. The Electro swing `&ticks`, the `sh` module and every chancy line of the examples carry theirs, written by it. A frontend that writes a chancy line of its own writes a seed, or leaves it to the content key as before. A cell that writes the same seed as another draws alike; a fragment taken twice with different arguments keeps its one seed.

### Changed

- **A written `seed=` is the seed alone, no longer mixed with what the cell carries** (#779): `seed=n` before picked a sequence *with* the cell's content; it is now the whole key, so a cell that wrote `seed=3` throws other dice. The `chance` example's `&ghosts` (`chance=.75 seed=3`) plays 442 notes in 40 s, not 451; no other example moves. A text that wrote a seed by hand reads other dice once; one that wrote none plays as before. A fragment of the library written with a seed (`electro_swing_drums`, `sh`) has a new hash.
