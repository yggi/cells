### Added

- **The shared types on the root** (#724): `ResolvedCell`, `Output`, `Unit`, `AudioTape`, `Shifts` and `Env` from the compiled piece, and `Atom`, `Braid`, `Token`, `FreeSpec` and `Pick` from the parser's tree, join `CompileResult`, `Plan` and `Diagnostic` at `@yggi/cells`. They are the types behind most of Cell studio's imports of `engine/program` and `engine/ast`; the module paths still work.
