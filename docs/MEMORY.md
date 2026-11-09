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
- `&key from diatonic(mode=dorian) D` a template's copy, `&bar from meter(swing=8n:.6) &tempo` its arguments, a signature `&bar from (&swing) &tempo` (decision 065); `&bd, &sd from gm_kit` a collection's cells, `&kick=bd from gm_kit` one renamed (decision 075), `* from gm_kit` every line; the piece's lines win; `use`, retired, read by nothing since #588 → [from](language/use.md)
- a piece's file: `title:` `tags:` `tier:` in its frontmatter (the card's `title=` `tags=` `tier=` the old way, a warning); `label=` `show=`, a cell's `tags=`; loudness: the card's `postgain=` (linear) → [display](language/display.md); a `show=` of the piece's own → [plugins](language/plugins.md)

## Decisions

Every decision, its substance in a line, is in [decisions/README.md](decisions/README.md)'s list; the record has the rationale. The numbers are Cell studio's, kept; the workbench's own decisions stay there. The few that shape any change:

- 027 · Cells sits on top of Strudel: a spelling shared with its mini-notation keeps Strudel's meaning · → decisions/027-on-top-of-strudel.md
- 049 · Four tools: Migrate, Normalise, Shorten, Fold · → decisions/049-four-tools-over-a-piece.md
- 050 · The equalities: E0–E5 and S1–S3 · → decisions/050-the-equalities.md
- 051 · Literate cells · → decisions/051-literate-cells.md
- 052 · Variations are operators · → decisions/052-variations-as-operators.md
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
- 066 · A wave and an envelope's times move: `attack=.3..0.01 * &x` on a `map=adsr` cell, `s=tri..square * &x`, read at each note's start · → decisions/066-a-wave-and-an-envelope-move.md
- 067 · An instrument with sound parameters is a module after its voices; the modules are fragments (`lowpass`, `amp`, `lfo` …); a cable opens at zero; a bipolar wave read as a share is (1 + x)/2 · → decisions/067-a-module-after-its-voices.md
- 068 · The core grammar: four primitives and the ramp; `free()` and chance sources; 45 forms sugar, checked by S1; Normalise writes sugar, a compile tool the core · → decisions/068-the-core-grammar.md
- 069 · Compile writes the core: de-sugar, minify, a checked core fold; `from` is sugar; `[ ]` a finer tap (core dilate only inside a tap the swing doesn't place, amended #15); draws keyed on content · → decisions/069-compile-writes-the-core.md
- 070 · S1 hears as a listener: ½ cent, 0.1 dB, 0.25 ms; a noise by colour and level; the snapshot stays exact · → decisions/070-s1-hears-as-a-listener.md
- 071 · A swing leans pairs: a group of three stays straight, `:pairs` says nothing more (Migrate drops it) · → decisions/071-swing-leans-pairs.md
- 074 · A filter is superdough's: low-pass, high-pass, band-pass (`bpf=`) in series, `ftype=` `12db` (default) `24db` (two stages) `ladder`; filters to patch are module fragments · → decisions/074-filters-are-superdoughs.md
- 076 · The style point is `sync harm drive bright`; energy leaves it as intensity, an offset from the style; entropy is the reach · → decisions/076-the-style-axes.md
- 072 · `even` is the foundation: `even(k, n, phase)` a table again, under the scales, the even rhythms and the meter; `euclid` stays the rhythm · → decisions/072-even-is-the-foundation.md
- 075 · A name is only a name: rename every name a text defines and it plays, says and is read as it did; no name the piece's by convention (the interface names retire); `alpha.test.ts`, its exceptions only shrinking (#560); a text's interface its signature's heads (`&harm, &key from`), never inferred · → decisions/075-a-name-is-only-a-name.md
- 077 · The core is sound only, cored up to a named interface (a fragment's signature, a piece's tempo, a score's gates); `x!n` is core, a count · → decisions/077-the-core-is-sound-up-to-an-interface.md
- 079 · A voiceless mix of cells is the sum of their values; a moving range's ends may be sliders, centre ± reach its sugar · → decisions/079-a-sum-of-cells-and-a-window.md
- 078 · Every number may be a `free()`, read by one reader over the table of places; a cell moves only a number read while the piece plays · → decisions/078-every-number-may-be-free.md
- 080 · A meter is a tree placed through a time map: `bend=4n:&table` bends a level's nodes, a tempo map where it spans bars; a meter scan is its sugar · → decisions/080-a-meter-is-a-tree-placed-through-a-time-map.md
