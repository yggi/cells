### Changed

- **The default performer reads a part and a drum role as values, not names** (#560 rung 2, decision 075; the feel contract's version 3, yggi/music-commons#60).
  - **`part=`** (bass, pad, stab, lead) goes on a performer's role cell, `&low map=role part=bass &lowOut`, or on a line, `&low part=bass …`.
  - **`role=`** (kick, backbeat, ghost, hat, pedal, euclid, clave, fill) goes on a drum line a kit plays: `&k role=kick step=16n &bd!4`.
  - **An event's part** is its performer's role cell's `part=`, else its line's. A drum hit's role is its line's `role=`. Nothing is read off an output's id beyond which line it plays, so a line named `&bass` with no `part=` plays as written, with no feel.
  - **The API:**
    - `readerOf(result)` reads the declarations and takes the result's `cells`.
    - `readerByName(result)` is version 2's reading by names, which Migrate reads; `readingOf(output)` stays as version 2's.
    - `perform`'s default reader reads nothing: pass `readerOf(result)`.
- **Migrate's `parts` rule** writes what a name gave: `part=` on a role cell or a line named as a part, `role=` on a drum line named as a role. Read the old way, such a line is warned of: "&bass is named as the feel's part bass, and a name gives none now". Fixture `parts/named`.
- **The seed library** writes its own: the performers' role cells (`&bass map=role part=bass &bassOut`), and the grooves' drum lines (`&kick role=kick …`, 73 lines). The seed fragments' hashes move.
- **The examples:** 13 are migrated (`clock`, `voice`, `effects`, `variations`, `midi-out`, `circle`, `idm`, `cellscape`, `electroswing`, `radio`, `soundtape`, `arrangement`, `bwv847`). Every example reads under version 3 as it read by names (`alpha.test.ts`). No `notes` or `events` hash moves; midi-out's `values` and `live` hashes do.
- **`alpha.test.ts` lists no exception:** every example holds alpha substitution written in and as written.

  **What a frontend sees at its next pin:** a text that relies on names for its feel plays without one until migrated. Jambot's section text writes `part=` and `role=` itself (yggi/jambot#615). A frontend that calls `readerOf` passes the whole compile result (it reads `cells`), and one that calls `perform` without a reader gets no reading.
