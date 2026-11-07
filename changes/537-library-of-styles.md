### Added

- **The library of styles, `STYLES`** (#537, part of #536): each preset style as `{ id, name, point, tempo }`, read from the seed collection `styles`, in its order. It is the one source a frontend takes its presets from. Each style cell now carries its display name as `label=` and its default tempo as `step=` (`&funk map=style label="Funk" step=104bpm sync=1 …`, the owner's ruling on #537). Only the library reads that `step=`: `style=` and a query read the point alone, so a style still has no tempo. Kinderlied joins the collection as `&kinderlied` at 96 bpm, Twinkle's tempo, so there are eleven styles, and a query of the facet `style` finds it.

### Changed

- **`@yggi/cells/repository/presets` is gone.** The presets' points by name (`FUNK`, `SPOOKY`, `KINDERLIED` …) and `at` are `@yggi/cells/repository/styles`'s, read from the collection instead of written beside it. No frontend imports the old module. Nothing a piece plays changes.
