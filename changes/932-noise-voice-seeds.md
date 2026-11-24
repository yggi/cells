### Added

- **A noise voice's grains are thrown from the seed it writes** (#932, decision 098): a voice of `s=white`, `pink` or `brown` that writes `seed=n` starts each note at a place in its noise thrown from `n` alone, so no edit to the text moves it; one that writes none is thrown from its place among the noise voices, as before. Normalise writes `seed=<i>`, the place a voice has, on every noise voice the text declares (45 lines in 26 examples; the tutorial's `voice`, `drums` and `rhythm`, below the tier that teaches `seed`, are left as they are), so **no sample moves**: 10 examples rendered before and after are equal sample for sample, and every noise voice of the 40 examples that have one throws from the key it threw from. A voice added above one that wrote its own number takes the first number no voice uses, so no two noise voices throw alike. A voice from a fragment (the General MIDI kit's) is not in the text and stays thrown from its place.

### Changed

- **A written `seed=` on a noise voice is its place, not a salt beside it** (#932): `seed=n` before was mixed with the voice's place; it is now the place. No example wrote one; a frontend that did reads other grains once. A piece's `snapshot.txt` values hash moves for 15 examples (a cell's `seed` is among the values), with no note or event moved.
