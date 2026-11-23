### Added

- **A variation's lineage, in the language** (`src/repository/lineage.ts`, decision 052, points 4 and 9): `variationMeta(varies, variation)` gives the meta a variation is filed with (`varies:`, `by:`; `VARIES` and `BY` the keys); `originOf(layer, id)` reads it back; `ancestry(layer, id)` the chain to its root, each step with the `by:` that made it, so a lineage replays from its seed by `variationBy`; `rootOf` and `familyOf(layer, id)`, the root and every filing descended from it, as Jambot's `novelty.ts` `familyOf` reads a family, a chain that comes round on itself ended.
