### Added

- A rhythm strikes even's places by phase (decision 093 §6, #531's third rung): `x(even(k, n, p))` after a step, read as Strudel's `x(k, n, r)` is (k of n parts of the step, each hit 1/n long), but at even(k, n, p)'s places, `p` its phase rather than Strudel's turn. `&claves(even(5,16,2))` on a bar is the bossa nova clave. A `Euclid` in the AST may carry `even: true`, its `r` the phase.

### Changed

- The even rhythms of the seed library are written from even: `bossa_nova_clave_one_bar`, `bossa_nova_clave` (on a step of two bars) and `cinquillo` with `x(even(…))`, `tresillo` tapping its table (`step=&(even(3, 8, 2) step=1m*3):pulse`), `bell_and_scale` its key `scale(even(7, 12, 5), &tonic)`. They strike where they did. The cinquillo's and the two-bar clave's strokes are now an eighth long, not a sixteenth (their own grid); with the kit's claves, whose envelope dies in 60 ms, they sound the same. No example's events move. Vary gives a Euclid no reference, so these claves' variations have none.
