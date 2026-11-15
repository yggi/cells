### Added

- A rhythm strikes even's places by phase (decision 093 §6, #531's third rung): `x(even(k, n, p))` after a step, read as Strudel's `x(k, n, r)` is (k of n parts of the step, each hit 1/n long), but at even(k, n, p)'s places, `p` its phase rather than Strudel's turn. `&claves(even(5,16,2))@16` on sixteenths is the bossa nova clave, its one step held over its sixteen parts. A `Euclid` in the AST may carry `even: true`, its `r` the phase.

### Changed

- The even rhythms of the seed library are written from even: `bossa_nova_clave_one_bar`, `bossa_nova_clave` and `cinquillo` with `x(even(…))@n` on the grid they tap, `bell_and_scale` its key `scale(even(7, 12, 5), &tonic)`; `tresillo` keeps its durations written. They strike where they did. The cinquillo's and the two-bar clave's strokes are now an eighth long, not a sixteenth (their own grid); with the kit's claves, whose envelope dies in 60 ms, they sound the same. No example's events move. Vary reads such a line as its steps written out, and gives it no reference (as a Euclid has none).
