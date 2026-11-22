### Removed

- **The language keeps no retired form before 1.0.0** (#643, the owner on 2026-11-22: "the real job of migrate begins with 1.0.0. before that, we throw out anything old"). Eighteen forms that Migrate rewrote and the parser or compiler still read, each with a warning, are errors now or unknown words, with no special case in the parser for them:
  - **gates:** `trigger=`, `velocity=`, `gate=` and the gate `gain=` (spell `play=` and `level=`);
  - **a meter's own steps:** `step=&bar*2` (a tap: `step=8n`; an error that names it);
  - **bare swing:** `swing=.67` on a meter (`swing=8n:.67`; an error that names the level);
  - **`over=key`**, the bare word (`over=&key`); `CompileResult.mainKey` stays, for a host that shows one key and Normalise's `&key`;
  - **moved and forwarded ids:** a seed fragment a piece took as its part (`&twinkle from twinkle &key`, now `from kinderlied &key`), and `"core kit"` and `"gm kit"`;
  - **grids:** `cycle=19 map=edo` (`map=edo(19)`, `map=ed(7, 3/2)`);
  - **laps counted in steps:** a warning for `cycle=24` on a 12 that says `cycle=2`;
  - **renamed ids:** an old seed id (`"harmonic minor"`) finds no fragment, and a lockfile or learned layer naming one is not read (`RENAMED_IDS` stays only for the order a query breaks its ties in);
  - **`oneshot`**, the bare line word (`oneshot=1`);
  - **`beat=n`** on a meter (`meter("2/2", 2)`);
  - **`:pairs`** after a swing share;
  - **a drum's note and a part or role given by name:** `&bd` as General MIDI's kick, `&bass` as the bass part, `&kick` as the kick role, with a warning that wrote the attribute (write `note=36`, `part=bass`, `role=kick`);
  - **the old style axes:** `artic=` and `energy=`, `&style[artic]`;
  - **a second meter with a tempo of its own**, and **a bare tap in a piece with several** (errors that write the tap, as before; no longer read the old way);
  - **`law=`** written by a piece (`&cycle from five_to_twelve &day`; the attribute is still written by a built-in plugin-fragment's block).

  **Migrate** is one rule now, `arguments`; its `MigrationRule` is `'arguments'`, and `migrate`, `migrations` and `normalise` no longer read a text the old way except for that rule. **Normalise** loses the rules that folded a second meter into the main one (`tapClock`, `shadowMeter`), since a text with two meters is an error. **`migrateLayer`** and its steps (`renamedLayer`, `signedLayer`, `axedLayer`, `roledLayer`, `movedLayer`) are removed with the forms they migrated (ids, signatures, axes, roles, moved parts), as are `OLD_AXES`, `newPoint`, `movedIds`, `MOVED` and `RETIRED`. **`withBeats`** and `MAIN_KEY` are removed.

  **What a frontend sees at its next pin:** a text that still writes one of these forms is an error or a warning-less unknown word, where it was read with a warning. **Jambot's pin imports `OLD_AXES`, `newPoint`, `movedIds`, `MOVED` and `renamedLayer`** (the ledger listed them): its learned-layer migration goes with them, so a layer kept before v0.23.0 is not migrated; a frontend that still carries one resets it. No example's event snapshot moves; the examples and the seed fragments write none of these forms.
