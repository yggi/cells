### Changed

- **The funk, lo-fi hip hop and bossa nova drums take their euclid's levels from `metric_accent`** (#799; the owner, 2026-11-23, with Jambot's change accepted). Each is `&euclidLevel from metric_accent(floor=…, peak=…)`, bracketing the velocities E31's band wrote. The rest of each bar is E31's word for word.
  - *Funk*'s rim moves: 88 of its 577 events in 30 s change level, by at most .046. Its notes are the same. No other example takes these three.
  - Vary reads a plugin's `from` line as the lines it answers (`answeredIn`, `engine/use`), so the three keep their 51 rim variations.
  - The outline lists a groove's head once where a nested `from` line gives it.
- **`answered(text)`** is exported from `@yggi/cells/repository`.
- **For a frontend, the migration:** a frontend that reads a rhythm's lines by dropping its `from` lines (Jambot's `grooveLines`) reads them through `answered` first. Otherwise these three grooves and `breathing_drums` lose their level lines: `answered(text)` writes each plugin's `from` line out as its answer, and leaves the kit's `from` line to drop.
- **For a frontend, what it hears:** the three grooves' rim strokes play at `metric_accent`'s levels, no longer Jambot's band's velocities.
