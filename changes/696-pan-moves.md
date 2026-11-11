### Added

- `pan=` moves, as `lpf=` does: a cell, a `free()`, or a range times cells (`pan=&space`, `pan=0..1 * &lfo`), read at each note's start and held for it (#696, decision 085 §5). It is carried in the note's channel gains, as a fixed `pan=` is, so a frontend plays it with no change; `Played.params` gains no `pan`. A sound that rings without notes (a resonator alone, a tape's read head) can't read it: it sits in the centre, with a warning. MIDI out sends no pan, as before.
