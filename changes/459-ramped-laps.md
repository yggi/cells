### Fixed

- **A ramped line that loops starts each lap at its first value** (#459, after #341). A `map=lin` line read a step that landed a float's width before one of its laps' starts as the end of the lap before, so a note starting there began at the line's last value. It now reads that lap's start, as a level line does since #341; the step in force (a pitch term, a held pick) reads its lap the same way, which moves nothing. **What changes in the examples (on purpose; their `events` hashes move, no `notes` hash does):**
  - `waveforms`: four of `&square`'s notes (at 8.7, 17.1, 32.7 and 36.3 s) start at `&pluck`'s 1, not 0, as every other note does: their first 100 ms 9.7 dB louder, as loud as their neighbours;
  - `lullaby`: one of `&box`'s notes (at 20.78 s) starts at `&ring`'s 1, not .1: its first 100 ms 13.3 dB louder;
  - `waveforms`, `pertonos`, `pachelbel`, `pop`, `spooky`: 30 notes' vibrato bends move by about 10⁻¹² of a cent (a vibrato line read a hair later), which no one hears.

  - `effects` and `waveforms` are respelled, as Normalise writes them: their `scan(1 1 1 1)` read differently from `meter("4/4")` only by this, so each is `&bar from meter_4_4 …` now (`waveforms` folds its `&tempo` in: `from meter_4_4 100bpm`). Their notes and events stay as above; their values and live views move (the bar's cell is the fragment's), and `waveforms`' inline voice is named by the line it moved to (`λ20_14`, was `λ21_14`). So the tutorial teaches `scan(…)` in tier 3, with a scale's steps (`transpose`), where it taught it in tier 2 with a bar's four beats.

  **What a frontend sees at its next pin:** those five notes with their attack; nothing else it can hear.
