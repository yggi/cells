### Added

- **A style's axis may be a slider** (#576, rung 1): `sync=free(.3, 0..1)` by name, or `&mine map=style free(.3, 0..1) .45 .55 .55` in order, its range within the axis's. The slider is named by its axis, and what reads the style (`&style[artic]`) reads its value. An axis moved by cells (`sync=0..1 * &walk`) is an error that names the next rung. A new example, *Radio*, is a score the default band plays with its style on four sliders. Nothing an existing piece plays changes.
