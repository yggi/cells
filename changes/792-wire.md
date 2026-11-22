### Added

- A braid fill's arguments reach its code as their core (#792, rung 6d of #691; decision 085 §8.3, #749), in the wire grammar, version 1 (`docs/language/plugin-wire.md`):
  - a number or a word as written; anything else as the steps it plays, references written in and the sugar gone (`&m!2 &m^2` is handed as `0 2 4 0 2 4 2 4 6`), so a renamed text hands the same arguments;
  - one read over a key is handed the key too, as `<parameter>:key`, its degrees' semitones from C;
  - what the grammar can't carry (chance, `free()`, a value that changes from lap to lap, a key that moves) refuses the fill, with a warning on the `from` line.
- **For a host:** `PluginFragment.wire` names the grammar a plugin reads; one newer than cells speaks (`WIRE`, 1, `engine/wire`) is refused. No piece sounds different: no seed has a braid fill.
