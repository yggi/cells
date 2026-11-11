### Fixed

- **A stack a gate plays reads its line wherever it is written** (#687, invariant I4; the owner's option a). In a member such as `&kickForm * &kick`, the factor that isn't a level by its own line (`map=amp`, `map=db`, `map=lin`, or a number) is the line, as a mix finds its voice. So `[&kickForm * &kick]` plays what `[&kick * &kickForm]` plays, where it was refused ("Two sounds can't multiply"). Two plain lines in one member still read the first as the line. No example changes; law L11 (`src/engine/commute.test.ts`) now holds over every example it rewrites, 73 of 73.
