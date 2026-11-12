### Added

- A product with no voice and a pitch, named, is notes with their levels (decision 087, #740): `&phrase [&notes * &accent]`, then `[&phrase * &glass * .3]`, plays `[(&notes * &accent) * &glass * .3]`. It was an error ("has no voice", "Two sounds can't multiply"); a frontend may now see such a cell compile, mixing nothing of its own. Read as a value or played with no voice it says what it is; picked or moved, it is an error for now. Law L17 (naming a sub-product plays as its parentheses do) checks it over every example. No example changes how it sounds.
