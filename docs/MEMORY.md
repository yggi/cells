# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about the cells language, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md).

## The project

The cells language: a minimal language for music where everything is a **cell**, a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid, on top of Strudel's mini-notation. This repository is the language as a pure TypeScript package, `@yggi/cells`: text in, events out, with no host of its own. Its frontends consume it at a tag: [Cell studio](https://github.com/yggi/cell-studio), the workbench (editor, graph, audio), and [Jambot](https://github.com/yggi/jambot), the interactive, multi-user frontend (the composer, the Muse, sessions). It came out of Cell studio with its history ([#1](https://github.com/yggi/cells/issues/1)); the eternal jam sessions it serves are in Jambot's brief (`docs/briefs/eternal-jam.md` there). It also holds the code of the repository of cell fragments (their format, canonical form, hash, index, queries), not yet written.

## The family

The music projects share a hub, [yggi/music-commons](https://github.com/yggi/music-commons): its atlas, charter, glossary and contracts. Cells implements `euclid` (Bjorklund's set, a turn of the canonical one) and `notes` (C4 = 60, through A4 = 69).

## Map of src/

The whole map, module by module: [architecture.md](architecture.md).

- `engine/` parse, compile, realize (plan → events), schedule (windows), the headless host, edit, Shorten, the folder (`fold/`, MIDI → cells), physics, FM, MIDI files (`midifile`, `midiimport`, `midiexport`, `miditext`), the time analysis (`time/`)
- `theory/` modes and tonal's scale names
- `index.ts` the package's surface; every module is also `@yggi/cells/engine/<module>`
- `engine/examples.generated.ts` every example's source, written by `npm run examples`
- `host.d.ts` the three host globals the language uses (the purity gate's whole allowance)
- `../examples/` the pieces, the language's conformance suite; `../midi/` the folder's corpus (Mutopia's Bach); `../fixtures/` test pieces

## Language cheatsheet

Details are on the linked pages; this list is only a pointer. → [language/overview.md](language/overview.md); every form at once: [language/reference.md](language/reference.md) (generated from the parser)

- `&name … ` one cell per line; steps `0 2 ~ 4@2 0!4 [0,2,4]` → [cell](language/cell.md)
- `scan(…)` `euclid(k,n)` `sin(n)`; `&t[i]` `&t[$i]` `&t[a:b]` `&t[<<n]` `&t^n` (degrees) `&t^$n` (grid steps) → [braid](language/braid.md)
- `over=&t` `scale(name, tonic)` `shift=n` `cycle=n` → [tables](language/tables.md)
- `step=` `loop=` (rates, `&x`, `cycle(&x)`, `*n` `/n`), `stride=`, `laps=` → [time](language/time.md)
- `map=edo|ed(r)|ratios`, note names → [tuning](language/tuning.md)
- `free(default, lo..hi)`, `free(0 2 4 ~)` a braid, recorded → [free](language/free.md)
- `[a * &voice, …]` mixes (sorts, `+` `*` commute), `map=sample` `postgain=` (its master, linear); a gate `&g play=&tune level=&a*.4 [&lead, &bell]` → [mix](language/mix.md)
- `map=midi` a MIDI card, entries channels; `midi(10)`, `midi(10, 2)` (slot 2) → [midi](language/midi.md)
- voices `s=` `loop=`, `env=` `pitch=` `map=adsr|amp|lin|db` → [sound](language/sound.md)
- belts, tape, resonators, FM → [physics](language/physics.md)
- `title=` `tags=` `label=` `show=`, loudness: the card's `postgain=` (linear); the tutorial: `tags="tutorial"` `tier=n` → [display](language/display.md); a `show=` of the piece's own → [plugins](language/plugins.md)

## Decisions

One line each; the record has the rationale. → [decisions/](decisions/README.md). The numbers are Cell studio's, kept; the workbench's own decisions stay there.

- 002 · `scale(tonic, phase)` stays as shorthand for two unnamed cells (superseded by 013) · → decisions/002-scale-shorthand.md
- 003 · `cycle=n` has one job; grids say `map=edo` · → decisions/003-cycle-one-job.md
- 006 · The mix algebra: a factor's sort (pitch, volume, signal) comes from the cell, not its place; `+` and `*` commute; numbers are semitones in a sum, a gain in a product · → decisions/006-mix-algebra.md
- 007 · `pan=` is back, a balance in dough's sense, compiled into the channel gains; two chords on the sound card stay valid · → decisions/007-pan-is-back.md
- 008 · A turning table comes round after its own length; `cycle=` only when it differs · → decisions/008-tables-come-round.md
- 009 · The tutorial covers every form once (a test checks); `tutorial` a kind of tag (it replaces `basics`), its own cell in the library; its rungs are superseded by 018 · → decisions/009-tutorial-ladder.md
- 010 · A canon's `[<<n]` is a copy (the score replayed); `play= at=` reads what was recorded; a tap of what was played waits for `&<` (#149) · → decisions/010-canon-copies.md
- 012 · A pick is a fixed tap on a turning wheel: `&x[i]` reads the cell as turned (and follows it while it plays), `&x[$i]` as written · → decisions/012-picks-are-taps.md
- 013 · `scale(name, tonic)` is a generator: a fixed mode by name over a key of its own; `shift=` walks its modes, the tonic transposes · → decisions/013-scale-generator.md
- 015 · `&x^n` moves by degrees (`degree(&x, n)`, relative), `&x^$n` by grid steps (absolute, the old `^n`): `$` is the absolute frame · → decisions/015-caret-is-degrees.md
- 016 · Arranging at the input: a section is a tap of the meter's bus, declared by a stepped table of names (`&parts step=&bar &keysBar …`) and switched by the selector (it restarts when switched on; it owns only what its tap steps or loops); the selector of mixes is removed (an error that says what to write); the switch and the gate node stay two mechanisms for now · → decisions/016-arranging-at-the-input.md
- 017 · Two tools: Shorten suggests on the piece being written (shorter, and migrations of removed forms), Normalise converges a corpus to one canonical spelling per duplicate, as a command of its own, never offered while writing · → decisions/017-shorten-and-normalise.md
- 018 · `free(0 2 4 ~)` is a braid left to the performer, a cell's whole braid; its length the frame a take fills; record (a flag on the transport) takes one pass of the armed cell from the keys, quantised through its time map, held until Keep; keys off the table: one setting, allow / snap / ignore, for playing and recording · → decisions/018-free-braid.md
- 019 · MIDI out in the language: a MIDI card, `map=midi`, its entries channels; `midi(c)` one channel, `midi(c, p)` an output slot, the MIDI page's pth output (its device this browser's); a voice only on a card is sent, not heard; a piece with a card sends only what its cards name, one without keeps the default output · → decisions/019-midi-card.md
- 020 · The tutorial is nine stable tiers (`tier=n` on the card, in place of the 30 numbered rungs): a tier's pieces together show all of its forms, a variation is a new file with no renumbering, and the lowest tier has the smallest pieces · → decisions/020-tutorial-tiers.md
- 023 · A gate is `play=&x` (the notes), `level=&a*&b*n` (one intensity, a product) and what it plays: a voice or a kit, a chord of voices (all), several bare voices (a kit, one picked); the old `trigger=` `velocity=` `gate=` `gain=` still read, Shorten rewrites them · → decisions/023-gate-spelling.md
- 026 · A cell can be a copy of another, changed where it says: `&foo base=&bar =!3 12@2` (`=` keeps a step, `_` before decision 027; a value changes it, `^$n` transposes the copy), resolved when parsed · → decisions/026-base.md
- 027 · Cells sits on top of Strudel: a spelling shared with its mini-notation keeps Strudel's meaning (`[a b]` a subsequence, chords with commas; `?p` drops; `*` on a clock faster; euclid rotates as Strudel's); a clean cut, no compatibility, until the first release · → decisions/027-on-top-of-strudel.md
- 028 · The smallest piece that sounds is `&a loop=A4`: a voice alone plays its own pitch, held (the pitch identity); with no card written, a built-in card (the built-in mixer, master gain .8) hears every sound nothing reads; the blank braid's staircase saw stays · → decisions/028-the-smallest-piece.md
- 029 · A kit read only selects: the product's pitch, volumes and varispeed act on the voice it picks (decision 006's law) · → decisions/029-kits-pass-pitch.md
- 030 · FM: `fm=n` `fmh=r` with Strudel's meanings, a voice's built-in modulator; feedback from a fixed wavetable; operator cells in the algebra (`(&tune + &op) * &carrier`); built with the feedback work · → decisions/030-fm-feedback.md
- 031 · Chance is keyed on the seed, the cell, the lap and the step, not the voice: a respelling keeps its dice · → decisions/031-chance-keyed-on-time.md
- 032 · `restart=` names what switching a part on does to its time: `restart` (default), `resume`, `free`; the last two parse and warn, not yet implemented · → decisions/032-restart-policies.md
- 033 · The folder writes a converted piece in degrees of its key where that's shorter (`&key scale(minor, C)`, lines `over=&key`, phrases `&m^1`); an accidental moves with its note under `^n`; Strudel's `6s`/`7f` and `scale("C:minor")` read as ours · → decisions/033-degrees.md
