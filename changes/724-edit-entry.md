### Added

- **`@yggi/cells/edit`, the first entry point by role** (#724): everything that changes a text, from one place: `setAttr`, `setTiming`, `setBraid`, `renameCell` and the rest of `engine/edit`; `patch`, `recordTarget`, `withHeld`; `variations` and its operators, `shorten`, `normalise`, `migrate`, `toCore`; a piece's file (`readPiece`, `writePiece`, `withLockfile`, `readLiterate`). Each name is the one a module path already gave, and the module paths still work. `engine/capture`'s `Take` is exported as `Recording`, so it is not taken for the score's `Take` of the root.
