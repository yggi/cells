# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about the cells language, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md).

## The project

The cells language: a minimal language for music where everything is a **cell**, a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid, on top of Strudel's mini-notation. This repository is the language as a pure TypeScript package, `@yggi/cells`: text in, events out, with no host of its own. Its frontends consume it at a tag: [Cell studio](https://github.com/yggi/cell-studio), the workbench (editor, graph, audio), and [Jambot](https://github.com/yggi/jambot), the interactive, multi-user frontend (the composer, the Muse, sessions). It came out of Cell studio ([#1](https://github.com/yggi/cells/issues/1)), and holds the repository of cell fragments with its seed library in `fragments/` (decisions 041, 046–048); a fragment's canonical form and hash are not built ([#49](https://github.com/yggi/cells/issues/49)).

## The family

The music projects share a hub, [yggi/music-commons](https://github.com/yggi/music-commons): its atlas, charter, glossary and contracts. Cells passes version 1 of `euclid`, `notes` and `swing` (with `:pairs`), and of `meter`'s names; it records where it differs (`meter`'s levels of four groups or more, which it doesn't halve) ([testing.md](testing.md)).

The language's open questions live in this tracker, [yggi/cells' issues](https://github.com/yggi/cells/issues); the frontends' trackers point here ([music-commons#14](https://github.com/yggi/music-commons/issues/14)).

## Map of src/

The whole map, module by module: [architecture.md](architecture.md).

- `engine/` parse, compile, realize (plan → events), schedule (windows), the headless host, edit, Shorten, Vary (`vary/`, decision 052), the folder (`fold/`, MIDI → cells), physics, FM, MIDI files (`midifile`, `midiimport`, `midiexport`, `miditext`), a render's span (`span`), audio (`render`, `audioexport`, `wavfile`, decision 062), the time analysis (`time/`)
- `theory/` modes and tonal's scale names
- `repository/` fragments found by their place in style space, with a learned layer (`fragments.ts`, `learned.ts`); files, holes and the fit (`files.ts`, `holes.ts`, `fit.ts`); the seed library, a module a facet, all in `library.ts`
- `index.ts` the package's surface; every module is also `@yggi/cells/engine/<module>` (`theory/`, `repository/` alike)
- `engine/examples.generated.ts` every example's file, written by `npm run examples`
- `host.d.ts` the three host globals the language uses (the purity gate's whole allowance)
- `../examples/` the pieces, the language's conformance suite, each a piece file (`engine/piecefile.ts`: title, tags and tier in its frontmatter, the piece in its ```cells blocks, decision 047, 051); `../fragments/` the seed library's files; `../midi/` the folder's corpus (Mutopia's Bach); `../fixtures/` test pieces

## Gates

- Gates that show themselves only by failing, and what fixes each (a stale generated file: `npm run examples` `fragments` `types` `dist` `reference`; a host global in `src/`; the snapshot, the ladder, the contracts, the ratchets, the strictness ratchet, the boot set over 24 KB): [testing.md](testing.md#gates-that-show-themselves-only-by-failing)

## Language cheatsheet

Details are on the linked pages; this list is only a pointer. → [language/overview.md](language/overview.md); every form at once: [language/reference.md](language/reference.md) (generated from the parser)

- `&name … ` one cell per line; steps `0 2 ~ 4@2 0!4 [0,2,4]` → [cell](language/cell.md)
- `scan(…)` `euclid(k,n)` `sin(n)`; `&t[i]` `&t[$i]` `&t[a:b]` `&t[<<n]` `&t^n` (degrees) `&t^$n` (grid steps) → [braid](language/braid.md)
- `over=&t` `scale(name, tonic)` `shift=n` `cycle=n`; the key named, `over=&key` (`over=key` the old way); a tonic read from a cell, `scale(dorian, &tonic)`, `&tonic D`, a mode read from a cell `scale(&mode, &tonic)`, `&mode dorian` (locrian 0 … lydian 6), stepped `&tonic step=1m/8 D F`, free `&tonic free(D)` → [tables](language/tables.md)
- `step=` `loop=` (rates, `&x`, `cycle(&x)`, `*n` `/n`), taps of a meter (`pulse` `beat` `16n` `4n.` `8t` `1m`, `&m:16n`, `cycle=n` bars), `beat=`, swing on the bar (`swing=8n:.67`, `:pairs` its pairs alone), `stride=`, `laps=` → [time](language/time.md)
- `map=edo|ed(r)|ratios`, note names → [tuning](language/tuning.md)
- `free(default, lo..hi)`, `free(0 2 4 ~)` a braid, recorded → [free](language/free.md)
- `[a * &voice, …]` mixes (sorts, `+` `*` commute), `map=sample` `postgain=` (its master, linear); a gate `&g play=&tune level=&a*.4 [&lead, &bell]` → [mix](language/mix.md)
- `map=midi` a MIDI card, entries channels; `midi(10)`, `midi(10, 2)` (slot 2) → [midi](language/midi.md)
- voices `s=` `loop=`, `env=` `pitch=` `map=adsr|amp|lin|db`; a line's articulation `legato=.5` (Strudel's) → [sound](language/sound.md)
- belts, tape, resonators, FM → [physics](language/physics.md)
- `&key from dorian D` a template's copy, `&bar from "4/4 swung on 8n"(swing=8n:.6) &tempo` its arguments, a signature `&bar from (&swing) &tempo` (decision 065); `&bd, &sd from gm_kit` a collection's cells, `* from gm_kit` every line; the piece's lines win; `use &bd from gm_kit` the old way → [from](language/use.md)
- `use &bd, &sd from gm_kit` the named cells and what they read, `use * from …` every line, `use &x` from x; the piece's lines win → [use](language/use.md)
- `&key from dorian D` a template's copy, `&bar from swung(swing=8n:.6) &tempo` its arguments, a signature `&bar from (&swing) &tempo` (decision 065); `&bd, &sd from gm_kit` a collection's cells → [use](language/use.md)
- a piece's file: `title:` `tags:` `tier:` in its frontmatter (the card's `title=` `tags=` `tier=` the old way, a warning); `label=` `show=`, a cell's `tags=`; loudness: the card's `postgain=` (linear) → [display](language/display.md); a `show=` of the piece's own → [plugins](language/plugins.md)

## Decisions

Each in a few words; its line, with the substance, is in [decisions/README.md](decisions/README.md), and the record has the rationale. The numbers are Cell studio's, kept; the workbench's own decisions stay there.

- 002 · `scale(tonic, phase)` shorthand (superseded by 013) · → decisions/002-scale-shorthand.md
- 003 · `cycle=n` has one job; grids say `map=edo` · → decisions/003-cycle-one-job.md
- 006 · The mix algebra: a factor's sort comes from the cell · → decisions/006-mix-algebra.md
- 007 · `pan=` is back, a balance · → decisions/007-pan-is-back.md
- 008 · A turning table comes round after its own length · → decisions/008-tables-come-round.md
- 009 · The tutorial covers every form once (rungs superseded by 018) · → decisions/009-tutorial-ladder.md
- 010 · A canon's `[<<n]` is a copy · → decisions/010-canon-copies.md
- 012 · A pick is a fixed reader on a turning wheel · → decisions/012-picks-are-taps.md
- 013 · `scale(name, tonic)` is a generator · → decisions/013-scale-generator.md
- 015 · `&x^n` moves by degrees, `&x^$n` by grid steps · → decisions/015-caret-is-degrees.md
- 016 · Arranging at the input: sections switched on the meter's bus (point 8 amended by 061) · → decisions/016-arranging-at-the-input.md
- 017 · Two tools: Shorten and Normalise · → decisions/017-shorten-and-normalise.md
- 018 · `free(0 2 4 ~)`, a braid left to the performer, recorded · → decisions/018-free-braid.md
- 019 · MIDI out: a MIDI card, `map=midi` · → decisions/019-midi-card.md
- 020 · The tutorial is nine stable tiers · → decisions/020-tutorial-tiers.md
- 023 · A gate: `play=`, `level=` and what it plays · → decisions/023-gate-spelling.md
- 026 · A copy of a cell, changed where it says: `base=` · → decisions/026-base.md
- 027 · Cells sits on top of Strudel · → decisions/027-on-top-of-strudel.md
- 028 · The smallest piece that sounds is `&a loop=A4` · → decisions/028-the-smallest-piece.md
- 029 · A kit read only selects · → decisions/029-kits-pass-pitch.md
- 030 · FM: `fm=` `fmh=`, with feedback · → decisions/030-fm-feedback.md
- 031 · Chance is keyed on the seed, the cell, the lap and the step · → decisions/031-chance-keyed-on-time.md
- 032 · `restart=`: what switching a part on does to its time · → decisions/032-restart-policies.md
- 033 · The folder writes in degrees of its key · → decisions/033-degrees.md
- 037 · The handshake with Jambot · → decisions/037-the-handshake-with-jambot.md
- 038 · Jambot's score rulings, carried over · → decisions/038-jambot-rulings-carried-over.md
- 039 · Live MIDI lives in yggi/webmidi · → decisions/039-midi-lives-in-webmidi.md
- 040 · A meter's bar, pulse, beat and tree; lines tap it · → decisions/040-pulse-beat-and-laps.md
- 041 · Fragments found by style · → decisions/041-fragments-by-style.md
- 042 · A swing share as a fraction · → decisions/042-swing-share-as-a-fraction.md
- 043 · The composer selects, and generates what doesn't satisfy · → decisions/043-the-composer-selects.md
- 044 · "Tap" reads the meter; sections, readers, picks · → decisions/044-tap-reads-the-meter.md
- 045 · Node runs `dist/` · → decisions/045-dist-for-node.md
- 046 · Facets and co-use · → decisions/046-facets-and-co-use.md
- 047 · Fragments are files, pieces with holes · → decisions/047-fragments-are-files.md
- 048 · The learned layer is data the frontend hands in · → decisions/048-the-learned-layer.md
- 049 · Four tools: Migrate, Normalise, Shorten, Fold · → decisions/049-four-tools-over-a-piece.md
- 050 · The equalities: E0–E5 and S1–S3 · → decisions/050-the-equalities.md
- 051 · Literate cells · → decisions/051-literate-cells.md
- 052 · Variations are operators; each with its reference, a form on its source (point 7, #293) · → decisions/052-variations-as-operators.md
- 053 · `swing=8n:r:pairs` leans the pairs alone · → decisions/053-the-pairs-alone.md
- 054 · Instruments are fragments; `use` (its forms amended by 059) · → decisions/054-instruments-and-use.md
- 055 · Recognition · → decisions/055-recognition.md
- 056 · Modes are fragments; two facets · → decisions/056-the-mode-facet.md
- 057 · S1 and S2 read a voice by its sound · → decisions/057-a-voice-by-its-sound.md
- 058 · The performer is a gate, its name its role (amended by 061: a role cell's); the register is the instrument's · → decisions/058-the-performer-is-a-gate.md
- 059 · A `use` says what it takes: `use &bd from core_kit`, `use * from …`, `use &x` · → decisions/059-named-use.md
- 060 · The key is named, `over=&key` (`over=key` the old way); a tonic is a cell, stepped or free · → decisions/060-the-key-is-named.md
- 061 · The band: a role cell says what its gates play as; a selector over the performers says when · → decisions/061-the-band.md
- 062 · Cells renders audio: events in, samples out, in blocks; superdough's meaning at the examples' level · → decisions/062-cells-renders-audio.md
- 063 · The score and the band: the score ends in `* from band` (`use * from band` before 065), each client's band its own; the style a note, read by name · → decisions/063-the-score-and-the-band.md
- 064 · What sounds: heard on any card, a MIDI card too; any written card replaces the built-in one; an out is a sound wired into a card, a voice each · → decisions/064-what-sounds.md
- 065 · Fragments take arguments: `&key from harmonic_minor D`; a signature declares one main parameter and optional ones; `use` retires · → decisions/065-fragments-take-arguments.md
