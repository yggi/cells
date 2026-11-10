### Changed

- **The grooves read only what they declare** (#637, the last of #560 rung 3c–e; decision 075, the owner's "B" on #637). The 22 rhythm fragments are templates. Their lines are their heads, so a piece takes them by name as before (`&kick, &clap from electro_swing_drums`). The drums they strike are optional parameters, each defaulting to the General MIDI kit's own line, taken inside the groove:

  ```
  &kick, &backbeat, &hat, &groove from (&bd, &sd, &hh)
  &bd, &sd, &hh from gm_kit
  ```

  - **A piece passes its own drum:** `* from funk_drums(bd=&kick)`. A piece that defines `&bd` itself and doesn't pass it is warned: "The piece defines &bd, and "funk_drums" takes its &bd from a collection by default: pass yours, funk_drums(bd=&bd), or rename it". There is no warning where its line is the kit's word for word.
  - **Read the old way**, a groove's `from` line passes the piece's own drums (`BOUND_BY_NAME`), and Migrate's `arguments` rule writes them (fixture `arguments/groove`).
  - **The expansion:** an optional parameter's default may come from a collection inside the template. It keeps its shared name, an argument that binds it by reference leaves it out, and a value argument makes it a cell of the copy's own.
  - **Vary** takes `resolve` in its options and compiles a fragment through it, so it varies a template groove. A `from` line reads nothing (`vary/lines.ts`). The recogniser passes `resolve` through.
  - **`fitsAs` and `useOn`** take a template of several heads with each head renamed clear of the workbench's names where it collides (`&kick2=kick, &hat2=hat from techno_drums`, decision 075 §3a–b), as the union renamed a collection's.
  - **Identity (`sameText`):** a text with no signature is a held template where it is the template's lines alone. So a groove heard and filed as its lines (Jambot's Muse) is still the seed groove it plays. Two templates are one only with their signatures alike, as before.
  - **The examples:** no `notes` or `events` hash moves. The `values` and `live` hashes of `electroswing`, `spooky` and `kinderlied` move.

  **What a frontend sees at its next pin:** a groove's text starts with its signature and a `from gm_kit` line, so it compiles only with a resolver. A frontend that reads a groove's lines (Jambot's `rhythms.ts`: compiled alone, unioned with a bench, varied) reads `bodyOf` with a resolver, or the lines with the `from` lines aside, and passes `resolve` to Vary. A frontend that writes a piece with its own drum named as the kit's passes it (`funk_drums(bd=&bd)`).
