### Changed

- A cell that is one number and nothing else is a plain value, as the number is (decision 088, #754): `&vol .5` then `[&tune * &vol * &lead]` plays at half level, where it played a quarter tone sharp. **A text changes meaning** where such a cell was a bare factor of a product and meant a transposition (`&oct 12`, `[&tune * &oct * &lead]`: an octave up before, twelve times louder now); write the sum, `[(&tune + &oct) * &lead]`, which plays the octave before and after. Migrate can't write it: the two readings are one spelling. No example and no seed fragment holds the form. A frontend may see `sort: 'plain'` on a cell with no `map=`. Law L18 (naming a number plays as the number) checks it over every example.

### Fixed

- A sum of values (decision 079) as a factor of a product with a sound is a level, its weighted sum held to 0…1 (#755): it did nothing and said nothing. In a pitch sum it is an error that says so.
