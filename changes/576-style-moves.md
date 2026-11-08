### Added

- **A style's axis may move** (#576, rung 2): `artic=.2..0.9 * &drift` by name, a range within the axis and the cell that moves it, or `artic=&drift` for its whole range. What reads it (`&style[artic]`, or `&mine[artic]`) reads that cell, its numbers from 0 to 1 laid within the range, on the cell's own clock. A choice drawn each step is a sample-and-hold: `&drift step=1m/8 [0|.25|.5|.75|1]`. One cell moves an axis, and a mix or a range of styles doesn't move with a moving one yet; both are errors that say so.

### Changed

- **The example *Radio* drifts.** Its articulation moves once a section and its energy once every two, each by a sample-and-hold, and its syncopation and harmony stay sliders. Its event snapshot moves, as the point of the change. No other piece's does.
