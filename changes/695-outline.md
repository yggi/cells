### Added

- **A piece's outline** (#695): `outlineOf(result, { facetsOf })` gives a compiled piece's parts, each a `from` line's take or a line the piece writes itself, linked by what reads what, as two trees of the same graph: `ground` (each part under what it is taken on, so a score's key holds its harmony and the harmony its bass line) and `outputs` (each part under what plays it, so the band's card holds an instrument, the instrument its performer, the performer its line).
  - `* from band` is one part, and each performer and instrument the band takes is a part inside it (`within`), by the fragment it takes.
  - A line that splices voices plays on them (`on`), in neither tree.
  - For Jambot's Cells view (yggi/jambot#642) and Cell studio's fragments (yggi/cell-studio#621). Nothing played changes.
