### Changed

- **The core writes repetition as counts** (decision 077 §3; #581, rung 3). A new last family, `counts`, writes every maximal run of alike steps as `x!n`, at every depth: `0 0 0 2` is `0!3 2`, `~ ~` is `~!2`, `0@2 0@2` is `0@2!2`. It writes `x*n` as `[x!n]`. As written:
  - a cell read by its units (picked or rotated);
  - a cell that counts its own laps (`cycle=`);
  - a map's arguments (an envelope's `a d s r`, ratios, a role);
  - a splice inside brackets, and `x*n` of a splice, where `[&sd &sd]` is not `[&sd!2]`;
  - a generator's steps.

  `repeats` still writes counts out at the start of each round, so the families between read every step. Over the examples, the core is 3.4 % shorter (72,050 → 69,617 characters; 45 shorter, Musicbox 17 longer, as its fold finds other phrases). Every rewrite is exact by S1. Nothing a piece plays changes.
