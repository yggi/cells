# Changelog

What changed in the cells language, newest first: what a frontend (Cell studio, Jambot) reads before it moves its pin, `github:yggi/cells#vX.Y.Z`.
A release is a tag, and it gathers the entries under *Unreleased* beneath its own heading.
An entry says whether a piece reads and sounds as before; one that breaks a piece names its migration (Shorten writes migrations), and before 1.0 it makes the next release a minor version.

Format: [Keep a Changelog](https://keepachangelog.com/), as Cell studio's (lifted from yggi/cell-studio CHANGELOG.md @ 6de7ce4, its form). Add a line to *Unreleased* in the pull request that makes the change.

## Unreleased

- **The package ships `docs/language/`** (the topic pages and the generated syntax reference), and `npm run reference` rewrites the reference and the README's index of forms. No piece reads or sounds differently, and nothing in `src/` changes; an install is about the size of the pages heavier (see the pull request).

## v0.2.0 — 2026-10-16

Since `v0.1.0`, no form means anything new: one example is rewritten (Canon per tonos, below), and one compiled field is renamed (`leveled` → `meter`), which a frontend reading it migrates.

### Changed
- **Canon per tonos places its voices with `pan=`** (yggi/cell-studio#418): the reed and the viola left, the cello right, each in the sound card's one chord, where two mixes made the two channels. It plays the same notes; how loud each is on each side moves a little (the pans rounded, the stereo panner's curve), the whole within 0.05 dB (60 s rendered: −23.94 dBFS rms against −23.90). A frontend now sees each instrument as its own out, leaning to its side. The language is unchanged; no other piece is touched.
- **One compiled `Meter`** (#16, part of #15): `meter(…)` and `scan(…)` compile to the same tree and time map (`src/engine/meter.ts`). `ResolvedCell.leveled` (boolean) becomes `ResolvedCell.meter` (`Meter | null`), and `SIGNATURES` is exported from the parser. No piece sounds different. A scan has a `Meter` too, so `meter !== null` is not `leveled`: migrate a read of `leveled` to `meter?.written === 'meter'`.

### Added
- **Declarations, `types/`** (#4): the `types` condition of `exports` points a frontend's TypeScript at them, so its own stricter settings (Jambot's `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`) don't fail on code it doesn't own. Runtimes (Vite, vitest, node) still take the source, and the import paths are the same: nothing to migrate.
- **The family's contracts** (#8): the hub's vectors for `euclid` and `notes`, version 1 (yggi/music-commons), run against cells in `src/contracts.test.ts`. Cells passes both, and two differences are recorded, not changed: it writes a mixed set of note names (C# Eb F# Ab Bb), and an attribute doesn't read a natural note in octave −1 (`loop=C-1`).
- **Decision 037, the handshake with Jambot** (#5, #9): cells owns the language and the repository of fragments, Jambot the composer and the jam; cells' spellings where they agree with Strudel, Jambot's meanings; Jambot's syntax in flight becomes cells'. A record, no change to the language yet.

### Repository
- The laws of `degree()` and `inverse()` the split lost, and Cell studio's strictness ratchet (`tools/strict.mjs`, in `npm run check`), the engine's architecture and testing pages (#3).
- The README links the docs on GitHub, since the package ships no `docs/` (#9).
- The gates (#12, yggi/music-commons#4): a pre-push hook runs `npm run verify` and prints its test count, and a test holds the boot reading (`AGENTS.md` and `docs/MEMORY.md`) under 24 KB.
- This changelog, a pull request template, and issue templates (bug, design question, epic).
- A clone's first `npm run verify` points git at the pre-push gate (`preverify`), so a human clone has it without an install script (yggi/music-commons#4).
- The pre-push hook refuses an untracked file git doesn't ignore (verify would see it, the commit lacks it) unless the commit's tree already passed, names it, and stamps only the tree its own run saw, as Cell studio's does.
- A `release` skill: what was done by hand for `v0.1.0` and the frontends' pins, as steps; a test holds the README's pin to `package.json`'s version.
- A `review` skill, lifted from Jambot's `review-pr`: a pull request in its own worktree, verified, its claims re-run, cells' rules walked; `tools/node-ts.mjs` lets Node run the source in this repository (a probe, a tool), not yet a frontend (#11).
- A `pianoroll` skill and `tools/pianoroll.ts`: what a text plays as a piano roll, SVG and PNG, two texts (or one text under two versions of the language) side by side with what differs outlined.

## v0.1.0 — 2026-10-14

The language as extracted from Cell studio at `e168c8d`, with its history (#1, #2): what a piece meant and how it sounded there is what it means here, so Cell studio's [changelog](https://github.com/yggi/cell-studio/blob/main/CHANGELOG.md) up to then is this tag's history.

### Added
- **The package `@yggi/cells`**, exported as TypeScript source: parse, compile and realize (`compileSource`, `plan`, `windowAt`), the headless host (`createHost`), edit, Shorten, the folder (MIDI → cells, `fold`, `cellsFromMidi`), MIDI files, physics and FM, and `theory/` (modes, tonal's scale names). Its surface is `src/index.ts`, and every module is also `@yggi/cells/engine/<module>` or `@yggi/cells/theory/<module>`.
- **The pieces and the corpus**: `examples/*.cells`, the language's conformance suite, and `midi/`, the folder's (Mutopia's Bach).
- **The language's docs and decisions** 002 to 033, numbered as Cell studio's.
- **The purity gate**: `src/` typechecks with no host types (`tsconfig.pure.json`; the three host globals in `src/host.d.ts`).
