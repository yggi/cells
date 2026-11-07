### Changed

- **A meter scan and a hit's gain are core** (decision 069, amended; #482, its last rungs). `scan(27 23 26 24) step=…`, a meter of uneven steps, and `&hh:0:.5`, a hit with its velocity (a terminal: a step's value, as a pitch is), have no other spelling in the language, so `toCore` leaves them as written and `Core.left` no longer lists them. 66 of 83 examples are now wholly in the core. Nothing a piece plays changes.
