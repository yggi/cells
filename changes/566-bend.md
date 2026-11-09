### Added

- **`bend=4n:&table`: a meter's level bent by a table** (decision 080; #566). The nodes of the level named by note value take the table's numbers as their relative lengths, in turn, the bar as long as before:
  - `&bar meter("*.-.+.-.") step=90bpm bend=4n:&rubato` with `&rubato 27 23 26 24` is a bent 4/4, its eighths leaning within each beat and tapped by level, which no form wrote before;
  - a table longer than the bar spans bars, a tempo map;
  - a swing composes with it.

### Changed

- **A meter scan is the sugar of a meter bent** (decision 080). `scan(27 23 26 24) step=r` is `meter("++++") step=r bend=4n:&(27 23 26 24)`. With `pulse=16n` the bar is one beat and the bend spans what the scan held, `laps=` counting the beats (BWV 847's tempo map). `toCore` writes all 19 examples' meter scans so, each S1-exact, but Royal's, a scan walked as a table by `step=cycle(…)`. A scan that is a table too gets its table as a cell of its own. A scan stays in the language as written; nothing migrates, and nothing a piece plays changes.
