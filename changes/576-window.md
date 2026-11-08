### Added

- **A moving range's ends may be sliders, and centre ± reach is its sugar** (decision 079, #576 rung 4).
  - `lpf=free(400, 200..800)..free(2400, 1200..4800) * &lfo` is a window a hand sets, the cell moving the value inside it.
  - `lpf=free(1200, 800..2000) ± free(400, 0..800) * &lfo` is the same window by its centre and reach, `(c − r)..(c + r)`, held at 0 below and, on a style's axis, to the axis (`+-` reads as `±`).
  - The sliders are named for what they set: `lpf low` and `lpf high`, or `lpf` and `lpf reach`.
  - `toCore` writes `1200 ± 400` as `800..1600`, and leaves `±` with a slider as written.
  - A new place in decision 078's table: a range's end.

  The example *Radio* writes its windows so, at the values it had: its sound doesn't change.
