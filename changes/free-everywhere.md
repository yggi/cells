### Changed

- Normalise writes a piece's tempo one way (the owner's ruling, 2026-11-15, #27): `&bar from meter 120bpm` becomes `&bar from meter &tempo` and `&tempo step=120bpm`, as a bar written on its own line already did. 16 examples are written so; none changes how it sounds.

### Fixed

- `degree(&x, n)` takes a number left free, `degree(&m, free(1, -7..7))`, as `&m^free(1, -7..7)` does (decision 078): it was an error.
