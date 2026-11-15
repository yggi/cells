### Added

- **A section's intensity, `&intensity`** (decision 096, #571): the song's plus its kind's offset, a sum a score writes (`&intensity [&song + -.45]`, a build `[&song + -.15 + &rise * .45]`). The default `band` takes it as an optional parameter, its own 1, and drives the drums, the bass and the stab by it, Jambot's dynamics lifted (`[&intensity * .35 + .65]`, `[&intensity * .25 + .75]`, `[&intensity * .2222 + .7778]`). `drums_performer`, `bass_performer` and `stab_performer` take that drive (`&drumsDrive`, `&bassDrive`, `&stabDrive`, 1 by default), read twice by the gate's level, since a level's square root is the velocity sent. A score that writes no intensity plays as it did. The four fragments' hashes move.

### Changed

- A cell that is one number (decision 088) is a term of a sum of values: `[&song + &breakdown]` with `&song .55` and `&breakdown -.45` is .1, where a sum whose cells were all numbers was refused ("A number is a gain or a pitch: it needs a voice"). A product of numbers in a sum is a constant.
