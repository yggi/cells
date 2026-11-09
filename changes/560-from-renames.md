### Added

- **A `from` line renames what it takes, `&new=old`** (#560 rung 3a–b, decision 075; the owner on #556 §3a–b). `&kick=bd, &snare=sd from gm_kit` gives the kit's `&bd` as the piece's `&kick`, and every line it takes reads it so. A template's several heads are renamed the same way: `&bass2=bass, &bassOut2=bassOut from bass_performer &line2`, its private names then `&bass2_…`.
  - **The fragment's name is a word of the line**, as a keyword is (`swing=`), not a name the piece binds. So a piece renamed writes `&x=bd from gm_kit`, and every name on its line is its own. A name without `=` keeps its name, as before.
  - **What it says:** a name bound twice, or one of the fragment's taken twice, is a malformed `from` line. A name the fragment lacks is said, and so is one the line binds that the collection gives by another line (`&sd=bd from gm_kit`).
  - **Normalise's narrowest `from`** keeps a line's renames, and writes `&bd=bd` as `&bd`. Migrate's `forwarded` keeps them too.
  - **The API:** `FromForm`'s use has `takes`, what each of `names` takes from the fragment, in the same order (the name itself where the line writes no `=`). `leftOf(names, takes)` writes a line's left side.
  - `alpha.test.ts` renames every name a `from` line takes, a collection's cells, a `*` written out by name and a template's several heads. `electroswing`, `spooky` and `kinderlied` stay on its list, now for the feel too, until rung 3c–e.

  **What a frontend sees at its next pin:** nothing written before changes meaning, and no event snapshot moves. A caller of `readFrom` (`cells/engine/parser`) that reads a line's `names` as the fragment's names reads `takes` for those; `names` stays what the line binds. Jambot calls no `readFrom`.
