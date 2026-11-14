### Added

- A key from any necklace (decision 093, #531): `scale()` takes a table where it takes a name, `scale(even(7, 12, &mode), &tonic)`, `scale(even(5, 12, &p), A)`, `scale(scan(2 1 2 2 1 2 2), D)`; the names are its sugar (`scale(dorian, D)` is `scale(even(7, 12, 3), D)`). `even(k, n, phase)`'s arguments may be cells that are one number, filled as the piece is built; a mode's name is a phase of `even(7, 12)` alone, and an error elsewhere that names the number. A stepped cell there is not yet a form.

### Changed

- The `diatonic` fragment writes its key `scale(even(7, 12, &mode), &tonic)`; it plays as it did. A parsed scan braid may carry `even`, its arguments, before compile reads them (`EvenArgs` in the AST), and a note step written as a mode's name carries `mode: true`.
