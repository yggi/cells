### Added

- **A text cell, and a generator's arguments read from cells** (decision 101, #902): `&meter "3/4"` is a cell that is one text, and `meter(&meter)` reads it as `meter("3/4")`; `euclid(&k, &n)`, the waves' `sin(&n)` and `spell(&word, &keys, &names)` read their cells too, each filled as the piece is built. A fragment's parameter can so pass a generator's argument: `&bar from bar(meter="3/4") &tempo`. **What a frontend sees at its next pin:** nothing it writes changes; a `CellDecl` may carry `text`, and a text cell has a node of its own in the graph, playing nothing.
