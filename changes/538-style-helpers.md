### Added

- **The style helpers a frontend needs, exported once** (#538, part of #536):
  - Each axis of `AXES` gains `label` (`'Syncopation'`) and `ends` (`['on the beat', 'off the beat']`). Its `sentence` is now said from its ends and reads as before.
  - `nearestStyle(point, { k, axisWeights, styles })` returns the styles nearest a point as `{ style, distance }`, nearest first, ties in the styles' order. A frontend that also ranks on an axis of its own, such as a tempo, passes `styles` with that axis added to each point.
  - `pointDistance` is exported from the root as the one distance between two styles.

  Jambot's `styleDistance`, `axesDistance`, `nearestPreset`, `presetOf` and its axes' words can then be these (yggi/jambot#596). Nothing a piece plays changes.
