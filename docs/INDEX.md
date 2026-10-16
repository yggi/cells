# Index

The full hierarchy of `docs/`. Start with [MEMORY.md](MEMORY.md).

- [MEMORY.md](MEMORY.md) — entrypoint: the project, the family, the map, the cheatsheet, decisions
- [architecture.md](architecture.md) — what lives where in the engine, and how text becomes events
- [testing.md](testing.md) — what the language's tests promise

## language/

- [language/overview.md](language/overview.md) — the map, and a whole piece
- [language/cell.md](language/cell.md) — the anatomy of a line
- [language/braid.md](language/braid.md) — generators, picks, slices, shifts
- [language/tables.md](language/tables.md) — `over=`, `shift=`, `scale()`
- [language/time.md](language/time.md) — `step=`, `loop=`, meters, laps, selectors
- [language/tuning.md](language/tuning.md) — grids and note names
- [language/free.md](language/free.md) — `free()`
- [language/mix.md](language/mix.md) — mixes and the sound card
- [language/sound.md](language/sound.md) — voices, envelopes, volumes
- [language/midi.md](language/midi.md) — MIDI cards: `map=midi`, a piece's MIDI channels
- [language/physics.md](language/physics.md) — motors, belts, tape, resonators, FM
- [language/display.md](language/display.md) — titles, tags, labels, `show=`, loudness (the card's `postgain=`)
- [language/plugins.md](language/plugins.md) — a piece's own `show=`: a block of code in the piece
- [language/reference.md](language/reference.md) — every form the parser reads, generated from it

## Directories

- [decisions/](decisions/) — one record per decision; the one-line list is in MEMORY.md
- [notes/](notes/) — the long threads the code cites: the folder, nets, the scalogram, the disassembler, the ratchet, multiscale, conversion, the canonical table, the corpus, the groove measure
  - [notes/10-language-pass.md](notes/10-language-pass.md) — the language pass: the invariants, Strudel and dough, the four primitives (moved from Cell studio)
  - [notes/10-examples-pass.md](notes/10-examples-pass.md) — the examples pass: drums on a kit, no extra mixers (moved from Cell studio)
  - [notes/gate-node.md](notes/gate-node.md) — the gate node: what a gate gates, kits and MIDI as receivers, ports and bands (moved from Cell studio)
  - [notes/groove-measure.md](notes/groove-measure.md) — swing, agogic and accent measured in the Groove MIDI Dataset, per style and level (`tools/groove.ts`, #19)
  - [notes/swing-research.md](notes/swing-research.md) — swing on several levels: the research, the drums' beat shapes, and a tree of proportions in the meter cell (#18)
