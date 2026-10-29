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
- [language/use.md](language/use.md) — `use &bd, &sd from gm_kit`, `use * from …`, `use &x`: a fragment's lines taken by its id, the resolver, the lockfile
- [language/canonical.md](language/canonical.md) — the canonical spellings: what Normalise writes
- [language/reference.md](language/reference.md) — every form the parser reads, generated from it

## Directories

- [decisions/](decisions/) — one record per decision; the one-line list is in its README, each decision's head in MEMORY.md
- [notes/](notes/) — the long threads the code cites: the folder, nets, the scalogram, the disassembler, the ratchet, multiscale, conversion, the canonical table, the corpus, the groove measure, open fragments
  - [notes/README.md](notes/README.md) — what a note is, its header, when it is written and when it is deleted (lifted from Cell studio)
  - [notes/10-language-pass.md](notes/10-language-pass.md) — the language pass: the invariants, Strudel and dough, the four primitives (moved from Cell studio)
  - [notes/10-examples-pass.md](notes/10-examples-pass.md) — the examples pass: drums on a kit, no extra mixers (moved from Cell studio)
  - [notes/22-open-fragments.md](notes/22-open-fragments.md) — open fragments: a fragment that leaves `&bar` and `&key` to the host, four options measured on three cases, and a recommendation (`tools/open-fragments.ts`, #22)
  - [notes/gate-node.md](notes/gate-node.md) — the gate node: what a gate gates, kits and MIDI as receivers, ports and bands (moved from Cell studio)
  - [notes/95-chord-in-force.md](notes/95-chord-in-force.md) — the chord in force: how a line reads the chord sounding, four options measured on Jambot's E33 bars, a proposal (`tools/chord-in-force.ts`, #95)
  - [notes/288-full-chain.md](notes/288-full-chain.md) — the full chain, fully fragmented: the repository, the workbench, what the conductor sends, the performer and the Muse, written out; three probes of `use`, three times a name is bound, named `use`, one model for every voice, what is tied to Jambot, and the rungs (#288)
  - [notes/315-score-and-rig.md](notes/315-score-and-rig.md) — the score and the rig: what the conductor sends, what each client plays it on (performers, instruments, cards, by `use * from band`), cells rendering the sound for both, Jambot solo as one host and one client, Cell studio's editable rig, the rungs and the questions (#315)
  - [notes/groove-measure.md](notes/groove-measure.md) — swing, agogic and accent measured in the Groove MIDI Dataset, per style and level (`tools/groove.ts`, #19)
  - [notes/swing-research.md](notes/swing-research.md) — swing on several levels: the research, the drums' beat shapes, and a tree of proportions in the meter cell (#18)
