### Changed

- **A key's tonic read from a meter warns** (#613): `scale(dorian, &bar)`, its tonic a meter (`meter("4/4")` or `from meter`), says `&bar is a meter: a key's tonic is a note (&tonic D)`, and plays as before (the meter's first level as a pitch class). So a query that names no argument no longer takes a workbench's meter as a mode's tonic: on a workbench of a meter alone, the modes don't fit; with a `&tonic`, they do as before. No example or seed fragment says anything new.
