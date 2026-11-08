### Added

- **A mix of cells with no voice is the sum of their values** (decision 079, #576 rung 3): `&drift [&section * .5 + &song * .3 + &set * .2]`, each cell's value at each moment times its gain, and any number added, held to 0…1 where a factor reads it. It moves a parameter or a style's axis like any line. Until now such a mix was an error, so no piece that compiled changes. A style's axis moved by a sum is laid within its range term by term, and a moving style read through a mix of styles (`style=[&funk * .5, &mine * .5]`) is the mix's weighted sum.

### Changed

- **The example *Radio*'s articulation drifts at three rates, summed**: a section, a song and a set, weighted .5, .3 and .2. Its event snapshot moves, as the point of the change. No other piece's does.
