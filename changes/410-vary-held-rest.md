### Fixed

- **Vary reads a held rest as its rests** (#410): a line that holds a rest (`~ 0 1b 0 ~@2 -1 0`) gets the variations the same line with its rests written out (`~ ~`) gets, for every operator, where it got none. A variation writes the rests out. The seed motifs `sigh` and `peek` are varied now as written; nothing a piece plays changes.
