### Removed

- **The view moves to Cell studio** (decision 086, rung 8 of #691; yggi/cell-studio#650):
  - `engine/routing.ts`, `engine/live.ts`, the built-in show plugins (`engine/builtinPlugins.ts`, the sun), `engine/parser/showMeaning.ts` and the parser's list of shows (`SHOWS`, `SHOW_CONVENTIONS`) are gone. The live view's snapshot (`live.snapshot.txt`) and the tests that read the routing or the live view went with them.
  - A plugin block is still text: the parser blanks it, and a compile hands a piece's own blocks on (`CompileResult.plugins`).
  - **For a frontend, the migration:** Cell studio takes `routing.ts` and `live.ts` (yggi/cell-studio#703) and its own built-in plugins (the sun) at this pin, and merges them with a piece's own (`result.plugins`). Jambot imports none of them.

### Changed

- **`show=` takes any word**, and any convention after a colon. The text keeps the word and gives it no meaning, and compile no longer says that a word is no show. Which words a frontend draws is its own (decision 086 §2). `show=mix:&grid` still reads its grid. A piece that wrote an unknown show was an error, and now compiles.
- **The hues stay in cells** (decision 086, amended 2026-11-23): `positionHue`, `positionOctave` and `freqHue` are on `@yggi/cells/inspect`, and `pitchHue` on `@yggi/cells/library`, one mapping for every frontend.
- **What Cell studio's lifted view reads is on entry points** (yggi/cell-studio#677):
  - on `@yggi/cells`: `chainMuted`, `droneEnd`, `endOf`, `kitPickAt`, `picksNow`, `voiceFor` and `pickedUnits`;
  - on `@yggi/cells/inspect`: `playing`, `unitsFor`, `noteEdge`, `sourceOf`, `Slot`, `ShowPlugin` and `pluginKey`;
  - on `@yggi/cells/repository`: `styleNamesIn` and `placeOf`;
  - on `@yggi/cells/library`: `SEED_FILES`.
