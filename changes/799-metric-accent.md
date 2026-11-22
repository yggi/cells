### Added

- **`metric_accent`**, the first built-in braid fill (#799; decisions 085, 090). It is a fragment with no style that writes a bar's levels from its metric weights:
  - `steps`, the steps of a bar;
  - `density`, which steps play;
  - `sync`, how far each step leans toward the weight of the step after it;
  - `peak` and `floor`, the strongest and lightest levels.

  Its fuel is 64 steps. A fragment takes it by its name, `&hatLevel from metric_accent(density=.75, sync=.2)`.
- **`breathing_drums`**, a new rhythm beside Ambient: one soft kick a bar, and hats whose levels `metric_accent` writes. It is second for Ambient (distance .087, where the waltz drums were at .290) and first for no style.
- **`answered(text)`** (`repository/answered`): a text with each `from` line that takes a built-in plugin-fragment written out as its answer. A template's lines alone, as `sameText` reads a groove, now hold a plugin's answer, no longer drop it with the kit's `from` line.

### Changed

- A braid fill's argument written as a number without its leading zero (`.3`) is handed as written. Only an error on the argument's own line refuses it (`engine/wire.ts`).

No example sounds different.
