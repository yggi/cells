### Changed

- A MIDI file imports with its meter (#760): a file with one time signature and a steady tempo writes `&bar meter("4/4") step=120bpm laps=…`, its swing as `swing=8n:…` or a bend as `bend=`, and its lines tap the grid by note value (`step=8n`), where it wrote a flat `&tempo scan(…) pulse=16n step=free(…)` and `step=pulse`. Every note plays when it did; a file whose tempo changes keeps the scan. A frontend that reads an imported piece's text (Cell studio's import, Jambot's analyzer) sees the new lines; no saved piece changes.
