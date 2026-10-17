# Changelog

What changed in the cells language, newest first: what a frontend (Cell studio, Jambot) reads before it moves its pin, `github:yggi/cells#vX.Y.Z`.
A release is a tag, and it gathers the entries under *Unreleased* beneath its own heading.
An entry says whether a piece reads and sounds as before; one that breaks a piece names its migration (Shorten writes migrations), and before 1.0 it makes the next release a minor version.

Format: [Keep a Changelog](https://keepachangelog.com/), as Cell studio's (lifted from yggi/cell-studio CHANGELOG.md @ 6de7ce4, its form). Add a line to *Unreleased* in the pull request that makes the change.

## Unreleased

### Changed
- **Swing on the bar** (#18's first rung, rung 2 of #81): `swing=8n:.67` on a meter leans one level of its bar, named by note value: of each pair of eighths the second starts .67 of the way through their beat, a group of three (6/8, 7/8's first beat) leans its second and third, and every beat and bar line stays where it is, so an odd bar no longer drifts. Taps are placed through it, whatever the meter's own steps (`meter("4/4") swing=8n:.67` swings `step=8n` and `step=pulse*2`); a division it doesn't hold stays even (`8t` under swung eighths). It swings a `scan(…)` too, which used to warn. Levels nest, coarse to fine: `swing=8n:.6,16n:.55`, which places Jambot's swing axis to 1e-9 (`fixtures/jambot-swing.json`). A level no beat divides into (`swing=4n:.67` in 4/4) leans nothing, with a warning.
- **A bare `swing=.67` on a meter warns**: it reads as the level of the meter cell's own steps (`meter("4/4", 2) swing=.67` is `swing=8n:.67`, and plays as before), and Shorten names the level. On a list stepping at a rate it keeps its meaning, pairs of its steps. A bare swing that paired steps across a beat or a bar line plays differently: `meter("7/8") swing=.67` now leans each beat (it drifted across odd bars), `meter("4/4", 3) swing=.67` leans each beat's triplets (it paired them across beats). The Swing and Metronome examples are respelled (`swing=8n:.67`, `swing=8n:free(.5, .5...75)`) and play the same at their defaults; the Metronome's slider now leans eighths on every grid (it paired the grid's own steps: quarters, triplets across beats, sixteenths).
- **`Clock.swung`** holds a swung meter's own steps (in its steps, a bar's); `Clock.swing` is only a list's pairs now. `Meter.swing` holds the levels (`SwingLevel`), `swingAt(meter, pulses)` places a position, and a decl's `swing` holds the levels as written. A tap reads its meter unswung and carries the swing in its positions.

### Added
- **v0.3.0 leftovers** (#92); none changes what a piece plays. **Shorten's `fractions` sees a tap**: `&t step=8n 4@2 2@2 0@2 5@2` offers `step=4n 4 2 0 5` (a note value, a triplet, `pulse*k`, `beat*k` and `1m/k` slow as written), and a line still stepped by a meter's own steps (`step=&bar*2`) is offered the tap (`step=4n`), not the old spelling that warns. **A tap on a belt names itself on its wire**: `step=8n belt=3000` is labelled `8n · belt` (`TransformStep` `rate` gains `tap`, the tap as written), as `step=&bar*2 belt=3000` was `×2 · belt`; a plain tap's wire stays unlabelled. **`SAILOR_WITH_KIT`** writes `step=8n`, so compiling it no longer warns three times.
- **A swing share as a fraction** (#101, decision 042): `swing=8n:2/3` is the exact triplet swing (`.6666666666666666`), `swing=16n:31/60` is `.5166666666666667`; a share above 1 or over a zero denominator fails at the fraction. A decimal reads as before, so no piece changes; the swung meters are written with their fractions and play the same. A bare `swing=` and a `free(…)` share are decimals still.
- **A tap written outside `step=` says so** (#103): `[&bar:16n * &tick]`, `&x 0 &bar:beat` or `over=&bar:8n` gave "&bar:16 would be a pitched hit", naming a cell the text doesn't have; the diagnostic now says that `&bar:16n` is a meter's tap which only `step=` reads, at the reference. Text that was an error stays an error; nothing that plays changes.
- **`legato=`: a line's articulation** (#94, rung 9 of #81), Strudel's `legato` (`clip=` reads as it): each note sounds its held length (its step, `@n`, `_`) times a share, `.5` staccato, `1.5` into the next note. A number, `free(…)` or a cell of shares on its own tap, read at each note's onset; nothing cuts a note at the bar line, so a share over 1 sounds past it, whole, in the events and in MIDI out. A share of 0 or less is an error. Absent is 1: every piece reads and sounds as before. With `glide=`, notes tie where they meet as they sound. E33's 384 bars, stated with it, play every bass, pad and stab note at Jambot's articulated length within 1e-6 steps (`fixtures/jambot-legato.json`, lifted from yggi/jambot).
- **A meter's articulation, `legato=16n:.5` by level** (#94, the owner's option 3 tried): a line that taps the meter and states no `legato=` sounds its notes at the share of its tap's level, the finest at or above its step (`legato=16n:.5,4n:.8`); a line's own wins. With `swing=`, one meter fragment carries a feel. Its swing, its taps and its own steps are as without it; `Meter.legato` and `tapShare(meter, tap, ratio)` are new.
- **A first repository: fragments found by their place in style space** (#82, decision 041, rung 5 of #81). `createRepository(fragments)` holds fragments, each cells text with an id and an association (weighted style points, axis names to numbers), and throws on a malformed entry; `query(point, k, axisWeights?)` returns the k nearest, ranked by a weighted distance over the axes the point and each association share, so an axis no fragment has is ignored. `METER_FRAGMENTS` are its first library, nine meters that need no swing (4/4, 4/4 alla breve, 2/4, 3/4, 6/8, 12/8, 5/4, 7/8 as 3+2+2, 10/8 as 3+2+3+2), each one line `&bar meter(…)` with no tempo, associated by hand with Jambot's eight presets (all of which find 4/4 until the swung meters land). New exports from the package and from `@yggi/cells/repository/<module>`; nothing a piece reads or plays changes.
- **The swung meters** (#82, rung 5 of #81): four 4/4s that lean, each the meter some of Jambot's presets find first and playing exactly the swing Jambot plays there (every sixteenth within 1e-9 of its `leanMap`): `4/4 swung on 8n` (`swing=8n:.6666666666666666`, the triplet swing: Swing jazz), `4/4 leaning on 16n` (`16n:.65`: Lo-fi hip hop), `4/4 leaning lightly on 16n` (`16n:.6`: Deep house and Funk) and `4/4 leaning faintly on 16n` (`16n:.5166666666666667`: Ambient). Straight 4/4 keeps Synth-pop, Techno and Bossa nova. `METER_FRAGMENTS` holds thirteen meters; nothing a piece reads or plays changes.

### Corrected: what the v0.3.0 notes left out
Cell studio and Jambot, moving onto v0.3.0, found more that a frontend sees. Nothing here changed since v0.3.0: the notes did.
- **A `scan(…)` is a meter for `step=&bar`'s warning**, as for taps: `step=&bar*4` under `&bar scan(1 1 1 1)` warns, and Shorten rewrites it (`16n`).
- **A tap's clock is not positional** (`Clock.positional` is `false`): a view that shows a stepped cell's rate in beats reads it through the tap's meter (`clocks.get(c.clock).cell`).
- **A belt on a tap is driven by the tap's clock at `rate: 1`** (`Clock.belt`): a pulley ratio against the meter is the tap's steps per the meter's, which the belt's `rate` no longer says.
- **A tap's step edge carries no rate transform**, so its label (`edgeLabel`) no longer says `×2`; #92.

## v0.3.0 — 2026-10-17

A line taps the meter by pulse, beat or note value (decision 040), so a change of meter or swing no longer changes what a line means.
Every example moved to taps and plays the same notes, except the Metronome's 7/8, which now groups 3+2+2.
Three forms change meaning or warn, and each names its migration below:
- `step=&bar` warns, and Shorten rewrites it;
- `beat=` now means a meter's beats;
- a scan whose entries aren't quarters says so with `pulse=`.

A frontend that looks a cell's clock up as a cell migrates (`clocks.get(c.clock).cell`).

### Changed
- **Taps by pulse, beat and note value; a tap comes round at the bar** (#74, decision 040, rung 1 of #15). A compiled `Meter` knows its pulse (`pulses`, the numerator), its beats (`beats`, each in pulses: 6/8 `3 3`, 7/8 `3 2 2`) and the note value of a pulse (`unit`, the denominator; a scan's is 4). A line taps it: `step=pulse`, `step=pulse*k`, `step=beat`, `step=beat*k`, note values `1n` … `32n`, triplets `4t 8t 16t`, dotted `2n. 4n. 8n.`, the bar `1m`, with a chain as on any clock (`1m/4`); of the main meter (the first in the text with a tempo of its own, `CompileResult.mainMeter`) or a named one (`step=&bar2:16n`). A note value longer than what is left of the bar is cut at the bar line; `cycle=n` on a tap runs it n bars. A tap is a clock of its own (`Clock.tap`: its positions in the meter's steps, laid through the meter's time map), named `meter:tap` (`bar:16n`), its cell the meter; a tapped cell's `step.driver` is the meter and `step.tap` the tap as written. A frontend that looks a cell's clock up as a cell (`cells.get(c.clock)`) migrates to `clocks.get(c.clock).cell`.
- **`step=&bar` warns** where `&bar` is a meter ("tap the meter by pulse, beat or a note value"), naming the tap that says the same; it plays as before. **Shorten writes the migration** (`taps`, a suggestion of kind `tap`): `step=&bar*2` → `step=8n`, `&bar/4` → `1m`, `&bar*3/4` → `2t`, a meter stepped by another → `step=&swing:pulse`, offered where the piece plays the same notes. Every example and doc moved to taps this way; no example's notes moved but the two below.
- **`beat=` states a meter's beats** (alla breve: `meter("4/4") beat=2`), no longer its steps a beat; on a cell that is not a meter it does nothing, with a warning. `bpm` counts beats: with unequal beats the bar lasts beats ÷ bpm and the beats keep their proportions (7/8 at 90: a bar of 2 s, beats of 0.86, 0.57, 0.57 s). A piece that wrote `beat=` on a list or a scan migrates by hand: Swing's `&bar2 1!8 … beat=2` is `meter("4/4", 2)`, tapped `&bar2:8n` (it plays the same); a scan whose entries aren't quarters says so with **`pulse=`** (`pulse=16n`: sixteenths, its beats then quarters and its bpm counting them), so BWV 847's tempo map, `beat=4`, is `pulse=16n step=free(89bpm, 60..120)` (it plays the same, its slider, MIDI clock and MIDI file as before). The folder (MIDI → cells) writes its tempo map with `pulse=` (`16n`, or `8t` for triplets) where it wrote `beat=`, and its lines `step=pulse`.
- **`meter("7/8")` groups 3+2+2** (was 2+2+3), as decision 040's table: the Metronome's 7/8 clicks move; no other example uses it.

### Added
- **The package ships `docs/language/`** (the topic pages and the generated syntax reference), and `npm run reference` rewrites the reference and the README's index of forms. No piece reads or sounds differently, and nothing in `src/` changes; an install is 119 KB larger unpacked (about 43 KB gzipped), the pages and the reference, and the package's tests hold it to at most 150 KB.

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
