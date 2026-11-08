### Added

- **Every number may be a slider** (#580, decision 078): `free(v, lo..hi)` goes wherever a number is written. That now includes `cycle=`, `laps=`, `seed=` and `size=`, a style's weight, an envelope's or a style's values in order, `euclid(k, n)` and the other generators' arguments, `fifths(n)`, `map=edo(n)`, `ed(n, r)` and `midi(c, p)`, a step of a braid (`0 free(2, 0..7) 4`), a step's `!n` `@n` `*n` `/n` `?p` and `(k, n, r)`, a pick, a turn and a move (`&x[free(0, 0..3)]`, `&x[>>free(4, 0..7)]`, `&x^free(1, -7..7)`), a hit's gain (`&hh:0:free(.4, 0..1)`) and a clock's `*n`. A number that shapes the piece is the slider's value now, and moving it compiles again. A whole place takes a whole range and rounds its value, and its spec is marked `whole: true`, so a slider can move by ones. Its range stays within the place's. `free.md`'s table of the places is generated from the parser's (`NUMBER_PLACES`). Nothing an existing piece plays changes.

### Changed

- **A cell where a number shapes the piece is an error that names the rule** (decision 078): `cycle=&k`, `&x[&k]`, `0!&k`, `shift=0..7 * &k`. A cell moves only a number read while the piece plays.
