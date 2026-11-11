### Added

- **A meter found from onsets** (#648, its first rung): `findMeter(onsets)` in `engine/time/cycles` reads a meter from when notes start, how strongly, how long and how low. It returns the tempo, the signature or grouping in twos and threes, a pair's swing at the eighth or the sixteenth (decision 071), where a bar starts, and a confidence for each. `meterText(found)` writes it as cells does: `&bar from meter(grouping=…, swing=…) &tempo` and `&tempo step=…bpm`.
  - **Its variants** (`Found.variants`): the same grid as half the bar and as two of it, each with its likeness. A bar and its half (2/4 and 4/4) sound the same and are told apart by little in the notes, so the reader that knows more chooses.
  - It reads a performance at a constant tempo. It reads onsets as written (on a grid to 12 ms) or, where nothing holds so, as played (to 45 ms).
  - What it finds is measured by `tools/cycles.ts` over four benches and held by a ratchet. `docs/notes/648-meter-finder.md` has the numbers, and what it can't know (a bar or two, a tempo or its double).
  - Nothing reads it yet. No piece plays differently.
