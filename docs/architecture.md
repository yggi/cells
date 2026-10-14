# Architecture

What lives where in the cells language, as Cell studio's architecture page described it when the language left it ([Cell studio's page](https://github.com/yggi/cell-studio/blob/main/docs/architecture.md) keeps the workbench's half: the layout, the audio, the UI). A name in `layout/`, `audio/`, `ui/` or `src/examples.ts` below is the workbench's.

## The flow

```
text
  parse()              engine/parser/     -> ParseResult (AST types: ast.ts)
  compile()            engine/compiler/   -> CompileResult (cells, clocks, outputs, tapes, diagnostics)
  plan(result, shifts, muted)  engine/realize.ts -> Plan
  windowAt(plan, from, length) engine/schedule.ts -> Window (plain data: what to play next)
  createHost()         engine/host.ts     the same as messages: load, window, grab, reset (a worker, this thread, node)
```

## src/engine


- `parser/` (`parse`, `pieceMeta`), `ast.ts`: one cell per line, read by construct:
  - `scanner.ts`: a line (continued lines joined), names, numbers, references with picks, shifts, `^n` and `^$n`.
  - `cell.ts`: a cell's line, its attributes and its braid in any order.
  - `braid.ts`: steps (numbers, rests, chords, subsequences, choices, cells) and their modifiers.
  - `generators.ts`, `free.ts`, `values.ts` (`step=`/`loop=`, `map=`), `units.ts` (a rate's units), `mix.ts` (a mix chord, kept as an expression).
- `attributes.ts`: every attribute in one table (what it means, takes and acts on; its doc page); the parser, compile, the node editor and the docs test read it.
- `algebra.ts`: the mix algebra ([decision 006](decisions/006-mix-algebra.md)): a mix's expressions typed by sort and distributed, one binding per voice.
- `program.ts`: a compiled program: its types (`ResolvedCell`, `Clock`, `Output`, `CompileResult` …), the `ROOT` grid, `MAX_EVENTS`, `BODIES`, `codeShifts`, and small readers of a cell (`pickIndices`, `pickSteps`, `adsrOf`, `isPositional`). `readers.ts`: the readers of a cell the engine, the layout and the components share (#317): `refsOf` (its channels, the `&ref`s in its braid), `ownRate`, `stepsPerSecond`, `lapOf`, `stepsAt`; the layout's beside them are `gridOf` / `heardPosition` (`layout/show.ts`), `envelopeOf` / `latestNoteAt` (`layout/envelope.ts`), and `midiOf` / `noteName` (`theory/modes.ts`).
- `helix.ts`: helix arithmetic, reading a program through the shifts: a cell's entries as turned (`entries`, `lookup`, `period`), a number resolved down to a grid (`resolveIn`, `resolvePitch`, `tableChain`), positions as pitches and colours (`semitones`, `positionHue`, `freqHue`, `gridName`).
- `compile.ts`: `compile()` and `compileSource()`; the phases are `compiler/`, run in order by `compiler/index.ts`. Each takes what it reads and returns what it makes (the cells pass along, each refining phase handing on a new map; the read-only phases get them read-only); they share only the diagnostics and the environment (`context.ts`):
  - `declare.ts` (declarations, the default grid, `scale()` tables, `over=` chains) → `builtin.ts` (no card written: the built-in card, an implicit `map=sample` declaration hearing every sound nothing reads; `CompileResult.builtinCard`: [decision 028](decisions/028-the-smallest-piece.md)) → `sorts.ts` (what each cell is, a mix typed: `algebra.ts`) → `resolve.ts` (cells as helices, `&refs`) → `bindings.ts` (kits, the sound card's channels, mixes expanded, voices) → `clocks.ts` (clocks, each cell's rate) → `checks.ts` (what physical and sounding cells refer to) → `outputs.ts` (one per voice binding, articulated; a voice alone, a drone: `Output.drone`) → `limits.ts` (the caps: notes a cell expands to, notes a second it starts) → `display.ts` (display tables, exciters) → `roles.ts` (attributes where they do nothing).
  - `tables.ts`: reading declarations as tables (`tableOf`, `lengthOf`, `unitsOf`).
- `realize.ts`: `plan` (every output's braid flattened once; drones apart, `Plan.drones`), `eventsBetween` (the notes that start in a window: tapes' echoes, laws, selectors, chance; a drone's held note where play began, `Held`); the gates the scheduler uses (`outputSounds`, `endOf`, `picksNow`, `liveGains`). Its parts:
  - `clocking.ts`: time. `timeMap` (swing, positions in a bar, a motor or a belt), `clocking` (a program's clocks at a moment), `shiftsAt` (tables turning), `playedCells`, `physicsOf`, `tapeMotion`.
  - `flatten.ts`: a braid as numbers in its own steps (`flatten`, `unitsFor`, `stepsOf`, `StepEvent`).
  - `subseq.ts`: subsequences (`[0 2 4]`, `[0 2, 4]`, decision 027): where each step inside plays (`slots`, which flatten, the live view and the time view's structure share), what a step holds at the bottom (`leaves`), its numbers moved (`mapLeaves`).
  - `series.ts`: a cell read as a stream over a note (`modulation`, `levelSeries`, `paramTracks`, `pitchOf`).
  - `values.ts`: what a cell sounds at a moment, for views (`valueAt`, `valuesAt`, `notesAt`).
  - `ids.ts`: graph ids (`cellId`, `edgeId`, `stepEdgeId`), shared with `muted` sets.
- `flows.ts`: where sound goes, one description (#132): every flow between cells (a mix's entries, a sound card's channels, a selector's parts (the old form, removed: decision 016), a mix onto a tape, a tape under a head, `excite=`, `couple=`), with its graph edge id. Read by `routing.ts` (the graph's states) and by `audio/wiring.ts` (the connections `voices.sync` makes), so the two can't drift apart.
- `routing.ts`: what takes part in the sound, as graph nodes and edges: `routing` (what can sound), `liveRouting` (what does now), `drawn` (through petals), `nodeStateOf`/`edgeStateOf` (off, unrouted, on, idle, live). One model for nodes and edges: [ui/graph.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/graph.md#states). `live.ts`: `liveAt`, the live view (playheads, lit table entries, and the live routing).
- `schedule.ts`: what to play next as plain data (`windowAt`, `tapeSpeeds`, `retime`, `isPhysical`). `host.ts`: the engine as a message handler (`createHost`: load, window, grab, reset; `planOf`, `grabIn`), what the worker runs.
- `plugins.ts`, `builtinPlugins.ts`: plugins, the app's own and a piece's ([decision 011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md), [language/plugins.md](language/plugins.md)): `splitPlugins` cuts the `=== plugin name ===` blocks out of the text (blanked, so lines keep their numbers) and reads each manifest; the drawing stays code in `ShowPlugin.code`, run by `ui/plugin.ts` only. `builtinPlugins.ts` is the bundle the app ships (the sun: the same block syntax, as data, so compile knows its manifest everywhere; a piece can't take its names). `parse` carries a piece's, `compile` puts both in `CompileResult.plugins`, `layout/show.ts` (`pluginOf`) knows which cells they draw.
- `edit.ts`: line rewrites. `graph.ts`: `writtenGraph`, the graph of exactly what is written: each edge a wire (port, band, width, along the flow) carrying its transforms; the graph's types, its nets (`netsOf`). `transform.ts`: what a tap does to what it carries (a pick, a delay, degree, inverse, a transposition, a gain, a rate), as data, and the edge's label drawn from it (`edgeLabel`).
- `duration.ts`: piece length / loop cycle (`pieceTime`, `sections`, `mainTempo`, `anchoredAt`; `clockText`, the transport's time). `held.ts`: `free()` values moved by hand, by their place in the code.
- `shorten/`: Shorten (`shorten`, `shortenAll` in `index.ts`), one rule a file (`runs`, `phrases`, `fractions`, `same`) over a shared `harness.ts`.
- `time/`: the piece in time, heard from its notes ([notes/scalogram.md](notes/scalogram.md), [ui/time.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/time.md)): `fft`, `wavelet` (the Morlet scalogram on a grid that thins for long pieces), `signals` (what a note is worth: impulses, envelope, voices, change, harmony), `boundaries` (cones, swells, novelty, scored against the sections written), `necklace` (foldings: a cyclic pattern at every level, the same one at several), `motifs` (a figure heard again, at another time scale), `spectrogram` (a waveform's peaks, a waterfall). For the time view, the probes and Shorten alike.
- `physics.ts` (motors, friction, belts: warps a clock's time map), `fm.ts` (Bessel spectrum), `wave.ts` (a voice's braid as waveform).
- `dough-params.ts`: sound parameter names. `order.ts`: the library's order of examples (`ORDER`: a new file in `examples/` needs an entry). `presets.ts`: `PRESETS`, every `examples/*.cells` read at once (one plain-text piece per file, the format users save), for the tests; `examples.test.ts` checks every file compiles clean and has a title, tags, and its card's `postgain=` (or no card: the built-in one), and that the index below is current. The app doesn't use it: `src/examples.ts` has the build-time index (`virtual:examples-index`, made by `tools/examples-index.ts` through a plugin in `vite.config.ts`: title, description, tags, size, time, bytes, and the graph in miniature from `layout/miniature.ts`) and `loadExample(key)`, which fetches a piece's source (its own chunk) when it's opened; only the first piece is in the first bundle. `fiveto12.ts`: the day-long cycle. `ladder.ts`: the tutorial in tiers, `TIERS` (the forms each tier introduces) and `formsUsed` (which forms of the reference a piece uses, read from what it parses to); `ladder.test.ts` checks every tier's pieces against it ([display.md](language/display.md#the-tutorial-tier)). `tags.ts`: the kinds of tag (genre, artist, tutorial, topic) and the examples' vocabulary.
- Tape and resonator have no file of their own; they live in parser/compile/realize/clocking (tests: `tape.test.ts`, `resonator.test.ts`).

