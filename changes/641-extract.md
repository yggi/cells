### Added

- **Lines of a piece as a fragment: `extract(text, lines, { id, resolve })`** (#641, rung C4 of yggi/cell-studio#621), `useOn`'s inverse. It writes the lines as a fragment and the piece taking it by a `from` line in their place. The signature it proposes:
  - **heads:** what the lines define that the rest of the piece reads;
  - **the main parameter:** the one cell the lines read as a value and don't define, passed as the main argument (`&bassline from my_vamp_bass &key`);
  - **private:** the rest they define;
  - **free:** a sound they strike, read by name (decision 065 §3).

  It checks that the piece plays the same (S1, 16 s by default), and says whether the library holds the fragment already (`known`, by `sameText`). Lines that hold a card, define the piece's main meter or key, read several cells they don't define, or that nothing else reads, say why instead.
- `readsAsValue` (`engine/use`) is exported: extraction asks the expansion's own question of what a fragment must declare.
