### Changed

- The table of kinds is read (#782, rung 2), by the three places that each worked out what a cell is:
  - **a cell's sort is its kind's** (law L21, `SORT_OF_KIND`): two kinds more make it so, `wave` (a braid at an audio rate with no sound parameter) and `groove` (a line of hits: a pattern read through a kit, a stepped braid of voices), 32 in all;
  - **what an attribute acts on** reads the kind where that is one (a tape, a read head, a resonator, a scope, a gate, the card, a note): every cell of every example has the roles it had;
  - **the Stats count** (`pieceStats().kinds`) is the kind, coarsened. **Three counts differ:** a gate is counted as a gate (it was a mix: `gate` was always 0); a `map=&table` cell is an envelope (it was a line); a wave that plays as no voice is a voice (it was a line or an envelope). Over the 89 examples: gate 0 → 20, mix 47 → 27, voice 383 → 389, envelope 490 → 488, line 844 → 840.
