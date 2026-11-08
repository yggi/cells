# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about the cells language, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md).

## The project

The cells language: a minimal language for music where everything is a **cell**, a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid, on top of Strudel's mini-notation. This repository is the language as a pure TypeScript package, `@yggi/cells`: text in, events out, with no host of its own. Its frontends consume it at a tag: [Cell studio](https://github.com/yggi/cell-studio), the workbench (editor, graph, audio), and [Jambot](https://github.com/yggi/jambot), the interactive, multi-user frontend (the composer, the Muse, sessions). It came out of Cell studio ([#1](https://github.com/yggi/cells/issues/1)), and holds the repository of cell fragments with its seed library in `fragments/` (decisions 041, 046–048); a fragment's canonical form and hash are not built ([#49](https://github.com/yggi/cells/issues/49)).

## The family

The music projects share a hub, [yggi/music-commons](https://github.com/yggi/music-commons): its atlas, charter, glossary and contracts. Cells passes version 1 of `euclid`, `notes`, `swing` and `meter` (every grouping, its names and its sizes, #17) ([testing.md](testing.md)).

The language's open questions live in this tracker, [yggi/cells' issues](https://github.com/yggi/cells/issues); the frontends' trackers point here ([music-commons#14](https://github.com/yggi/music-commons/issues/14)).

## Map of src/

The whole map, module by module: [architecture.md](architecture.md).

- `engine/` parse, compile, realize (plan → events), schedule (windows), the headless host, edit, Migrate, Normalise, Shorten, Vary (`vary/`, decision 052), the folder (`fold/`, MIDI → cells), physics, FM, MIDI files (`midifile`, `midiimport`, `midiexport`, `miditext`), a render's span (`span`), audio (`render`, `audioexport`, `wavfile`, decision 062), the time analysis (`time/`)
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
- `step=` `loop=` (rates, `&x`, `cycle(&x)`, `*n` `/n`), taps of a meter (`pulse` `beat` `16n` `4n.` `8t` `1m`, `&m:16n`, `cycle=n` bars), `beat=`, swing on the bar (`swing=8n:.67`, its pairs alone, a three straight), `stride=`, `laps=` → [time](language/time.md)
- `map=edo|ed(r)|ratios`, note names → [tuning](language/tuning.md)
- `free(default, lo..hi)`, `free(0 2 4 ~)` a braid, recorded → [free](language/free.md)
- `[a * &voice, …]` mixes (sorts, `+` `*` commute), `map=sample` `postgain=` (its master, linear); a gate `&g play=&tune level=&a*.4 [&lead, &bell]` → [mix](language/mix.md)
- `map=midi` a MIDI card, entries channels; `midi(10)`, `midi(10, 2)` (slot 2) → [midi](language/midi.md)
- voices `s=` `loop=`, `env=` `pitch=` `map=adsr|amp|lin|db`; a line's articulation `legato=.5` (Strudel's) → [sound](language/sound.md)
- belts, tape, resonators, FM → [physics](language/physics.md)
- `&key from diatonic(mode=dorian) D` a template's copy, `&bar from meter(swing=8n:.6) &tempo` its arguments, a signature `&bar from (&swing) &tempo` (decision 065); `&bd, &sd from gm_kit` a collection's cells, `* from gm_kit` every line; the piece's lines win; `use`, retired, read by nothing since #588 → [from](language/use.md)
- a piece's file: `title:` `tags:` `tier:` in its frontmatter (the card's `title=` `tags=` `tier=` the old way, a warning); `label=` `show=`, a cell's `tags=`; loudness: the card's `postgain=` (linear) → [display](language/display.md); a `show=` of the piece's own → [plugins](language/plugins.md)

## Decisions

Every decision, its substance in a line, is in [decisions/README.md](decisions/README.md)'s list; the record has the rationale. The numbers are Cell studio's, kept; the workbench's own decisions stay there. The few that shape any change:

- 027 · Cells sits on top of Strudel: a spelling shared with its mini-notation keeps Strudel's meaning · → decisions/027-on-top-of-strudel.md
- 049 · Four tools: Migrate, Normalise, Shorten, Fold · → decisions/049-four-tools-over-a-piece.md
- 050 · The equalities: E0–E5 (text) and S1–S3 (sound) · → decisions/050-the-equalities.md
- 068 · The core grammar: four primitives and the ramp; the rest is sugar, checked by S1 · → decisions/068-the-core-grammar.md
- 075 · A name is only a name: rename every name a text defines and it plays as it did · → decisions/075-a-name-is-only-a-name.md
- 077 · The core is sound only, up to a named interface · → decisions/077-the-core-is-sound-up-to-an-interface.md
