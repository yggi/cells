### Added

- **`coreFragment(text, options)`: a fragment cored up to its signature** (decision 077 §2; #590). A fragment doesn't play alone, so it is cored in a host:
  - each hole gets a stand-in: a voice, a stepped line, a meter, a tempo or a key;
  - each head is played on a card by its sort;
  - the host's lines are taken off again.

  The result keeps its signature line as written, its heads and parameters by name, and its own `from` lines as `from` lines, so a piece that gives its own `&bassV` still does. A tap under a meter the fragment doesn't define stays as written. Every example that uses the cored fragments plays the same.

### Changed

- **The core keeps an interface cell read by name** (decision 077 §2). A step that would leave a cell, read before, read by nothing (a copy written out, `base=&grouping` as its steps) isn't taken, and `copies` and `copy steps` leave a kept base alone.
- **`toCore`'s `skip` option** leaves families out by key.
- **`repeats` leaves a cell that counts its own laps (`cycle=`) as written**, where `x!n` is one unit.

Nothing a piece plays changes.
