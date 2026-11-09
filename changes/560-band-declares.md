### Changed

- **The band reads only what it declares** (#560 rung 3c–e, its second of three; decision 075, the owner on #556 §3c–e). It is a template now. Its heads keep their names in the score: `&band`, the role cells, the gates, the voices and the two cards. Its inputs are optional parameters: the five parts, their four levels and the style.
  - **A score passes what it writes:** `* from band(drumlines=&drumlines, bassline=&bassline, …, style=&style)`. `bandLine(score)` (`repository/band.ts`) writes that line for a score.
  - **What a score doesn't pass:** a part is a tacet (`&bassline step=1m ~`), and nothing is said; decision 063 §4's "plays &bassline, which no line writes: it rests" is no longer said of the band. A level is .8. A style is the centre of style space, and "no line writes &style" is no longer said of the band.
  - **Read the old way**, a bare `* from band` over a score that writes those cells passes them, with a warning; Migrate's `arguments` rule writes them (fixture `fixtures/migrations/arguments/score`). So every score plays what it played.
  - **The examples:** `radio` passes its parts and its style. No `notes` or `events` hash moves; its `values` and `live` hashes do.
  - **`*` from a template takes the heads the piece doesn't write**, as `*` from a collection takes what it doesn't define: a score that writes the band's `&drumsOut` itself plays its own line, and what that line reads of the band's copy (`&band_drums_kit`, as the expansion writes it) is kept (cell-studio#610).
  - **The band fits any workbench** now, every input declared and optional, so a query given a workbench ranks it among the fragments that fit.
  - `alpha.test.ts`: `radio` holds as written for sound and diagnostics; the as-written list is the feel's alone.

  **What a frontend sees at its next pin:** a score that ends in a bare `* from band` plays its band with every part resting, at the centre, unless it is compiled with `old` or migrated. Cell studio's scores and any conductor that writes a score write `bandLine(score)`, or pass the parts themselves. Jambot's section text takes the performers, not the band (yggi/jambot#621).
