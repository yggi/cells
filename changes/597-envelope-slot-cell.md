### Added

- **An envelope's slot may be moved by a cell alone** (#597): `attack=&a`, `sustain=&s` on a `map=adsr` cell. The cell's values are the slot's (seconds, or a level from 0 to 1 for `sustain=`), read at each note's start, as a slot moved by a range already is. Until a note reads it, the slot holds 0 in the envelope's braid, which `&env[attack]` reads. A value that is none of the slot's is an error. The errors at a range at a gain in a mix, a hit's gain, a style's weight and a range at a tonic now say what to write instead. Nothing an existing piece plays changes.
