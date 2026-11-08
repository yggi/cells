### Changed

- **`toCore` writes the mechanical rows, and every example is wholly in the core** (decision 077; #581, rung 4):
  - a euclid as its steps: `euclid(3, 8)` is `0 ~ ~ 0 ~ ~ 0 ~`;
  - a gate over a kit as its notes read through the kit (`&g over=&kit step=…`), its level a factor in the mix;
  - `x*n` of a splice as n of it in brackets: `&sd*3` is `[&sd &sd &sd]`, each line checked by S1;
  - a copy's braid over its base's steps: `&f base=&e^$7 =!3 0@2` written as the steps it plays, where its base is plain numbers reading no table;
  - a voice's `pitch=` in a product whose pitch is a sum, as one more term of it: `(&q + &k + &vib) * &v`.

  Each rewrite is checked by S1. Over the examples, `Core.left` is empty for all 83 (72 before #581's rungs). Nothing a piece plays changes.
