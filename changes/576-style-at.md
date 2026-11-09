### Added

- **`styleAt(text, seconds)`: the style a piece plays at a time** (#576 rung 5): a point, one value per axis, each as a voice reading `&style[axis]` reads it then: a held axis, a moving one (a line, a sum of cells, a window of sliders), a mix of styles, a range gliding over the piece; the centre where no line writes `&style`. `{ cell }` reads another style cell; `resolve` and `env` pass through. Jambot reads a radio score so at each section's start. `Plan` gains `seriesOf(cell)`, a cell's values as a moving parameter reads them. Nothing plays differently.
