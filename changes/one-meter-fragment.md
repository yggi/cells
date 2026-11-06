### Changed

- **The seed library's thirteen meters are one fragment, `meter`** (#507, decision 072).
  - **The fragment:** `&bar from (&grouping, &swing) &tempo`, written `&bar base=&grouping step=&tempo swing=&swing`; its defaults are `&grouping meter("4/4")` and a straight swing.
  - **Its points carry their arguments, one a style.** The repository holds it taken with each set: `meter`, `meter(swing=8n:2/3)`, `meter(swing=16n:.65)`, `meter(swing=16n:.6)`, `meter(swing=16n:31/60)`, `meter(grouping=meter("7/8"))` and so on. Every point is where it was, so every preset's query finds the same meter.
  - **The old ids still read for a minor version**, with a warning naming the new form, and Migrate rewrites them: `meter_4_4` → `meter`, `meter_4_4_swung_on_8n` → `meter(swing=8n:2/3)`, `meter_7_8` → `meter(grouping=meter("7/8"))`, and the older `4/4`-style ids the same.
  - **Alla breve is `meter(grouping=meter("2/2", 2))`**, two half-note pulses where `meter("4/4") beat=2` had four quarter ones. A line on `step=pulse` under it steps in halves; every other tap plays as it did.
  - **A copy of a meter is a meter:** `base=` keeps a meter's levels, its steps a beat and its signature.
  - **A point's arguments can be any value a line writes:** `8n:2/3`, `meter("7/8")`.
  - **A bound parameter that `base=` reads keeps its line**, its value its braid.
  - **Every example and doc names the new form.** Their notes and events don't move; their `values` and live hashes do, since the copies hold the template's helper cells.

  **Not yet:** Normalise doesn't rewrite a hand-written `&bar meter("4/4") step=&tempo` as `&bar from meter &tempo`, as it did when the 4/4 fragment was that line. That is a follow-up issue.

  **What a frontend sees at its next pin:**
  - The meter query answers the new ids, with their arguments.
  - A section text naming an old id warns until Migrate rewrites it.
  - `RENAMED_IDS` holds the thirteen.
