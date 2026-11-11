### Added

- Plugin-fragments, the first rung (decision 085, #693): `engine/holes.ts` types a fragment whose cells have holes its code fills with braid text (`PluginFragment`, `Hole`, `fill(hole, lap, args)`), with the built-ins (`BUILT_IN`), a lap's cells filled (`filledAt`) and its sections (`marksOf`). `fiveto12` is the first, built in (`FIVETO12`).

### Changed

- `law=fiveto12` is read by the language: its holes (degrees over `&key`, chords stacked in thirds, `@n` lengths, a level cell, a place cell, the key's mode and tonic) are filled bar by bar, compiled and played, where realize computed its semitones itself. It plays exactly what it played (the event snapshots don't move); its length and its twelve sections come from the fragment, not from its name. Each bar costs a compile the first time (about 2 ms), kept for the next 96 bars: 0.14 ms of work a second of music, where it was 0.01 ms. `law=` is still the spelling; `&cycle from fiveto12 &day` is rung 5.
