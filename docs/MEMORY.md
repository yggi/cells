# Memory

Entrypoint for humans and agents: slow-change, shared knowledge about the cells language, and a cheatsheet for the details in `docs/`. The full hierarchy is [INDEX.md](INDEX.md).

## The project

The cells language: a minimal language for music where everything is a **cell**, a helix (pitch classes over octaves, beats over bars) with a **braid** sitting in its grid, on top of Strudel's mini-notation. This repository is the language as a pure TypeScript package, `@yggi/cells`: text in, events out, with no host of its own. Its frontends consume it at a tag: [Cell studio](https://github.com/yggi/cell-studio), the workbench (editor, graph, audio), and [Jambot](https://github.com/yggi/jambot), the interactive, multi-user frontend (the composer, the Muse, sessions). It came out of Cell studio with its history ([#1](https://github.com/yggi/cells/issues/1)); the eternal jam sessions it serves are in Jambot's brief (`docs/briefs/eternal-jam.md` there). It also holds the repository of cell fragments: their format, a query by style and by the facet each association point hints, how often fragments were used together (decisions 041, 046), a fragment as a Markdown file (YAML frontmatter, a subset parsed in cells; decision 047) and a seed library of 26 such files (13 meters, 13 rhythms, `fragments/`) are built (`src/repository/`); their canonical form and hash are not ([#49](https://github.com/yggi/cells/issues/49)).

## The family

The music projects share a hub, [yggi/music-commons](https://github.com/yggi/music-commons): its atlas, charter, glossary and contracts. Cells implements `euclid` (Bjorklund's set, a turn of the canonical one) and `notes` (C4 = 60, through A4 = 69), and passes version 1 of both: `src/contracts.test.ts` runs their vectors, copied into `fixtures/contracts/` with the hub's commit, and records where cells differs (it writes a mixed set of names, C# Eb F# Ab Bb, neither column whole; an attribute doesn't read a natural note in octave −1, `loop=C-1`).

The language's open questions live in this tracker, [yggi/cells' issues](https://github.com/yggi/cells/issues); the frontends' trackers point here ([music-commons#14](https://github.com/yggi/music-commons/issues/14)).

## Map of src/

The whole map, module by module: [architecture.md](architecture.md).

- `engine/` parse, compile, realize (plan → events), schedule (windows), the headless host, edit, Shorten, the folder (`fold/`, MIDI → cells), physics, FM, MIDI files (`midifile`, `midiimport`, `midiexport`, `miditext`), the time analysis (`time/`)
- `theory/` modes and tonal's scale names
- `repository/` fragments found by their place in style space, the facet their points hint and how often they were used together (`fragments.ts`); fragment files (`files.ts`, frontmatter in `yaml.ts`); the seed library (`seed.ts`, from `../fragments/` through `seed.generated.ts`): the meters (`meters.ts`), the rhythms (`rhythms.ts`: E31's drum bars, five claves), both (`library.ts`)
- `index.ts` the package's surface; every module is also `@yggi/cells/engine/<module>` (`theory/`, `repository/` alike)
- `engine/examples.generated.ts` every example's source, written by `npm run examples`
- `host.d.ts` the three host globals the language uses (the purity gate's whole allowance)
- `../examples/` the pieces, the language's conformance suite; `../fragments/` the seed library's files; `../midi/` the folder's corpus (Mutopia's Bach); `../fixtures/` test pieces

## Gates

- Gates that show themselves only by failing, and what fixes each: a generated file gone stale, `src/engine/examples.generated.ts` (`npm run examples`), `src/repository/seed.generated.ts` (`npm run fragments`), `types/` (`npm run types`, after any change to an exported signature) or `dist/` (`npm run dist`, after any change to `src/`), `docs/language/reference.md` (`npm run reference`, which also rewrites the README's index of forms); a host global in `src/` beyond the three in `src/host.d.ts` (the purity typecheck, `tsconfig.pure.json`: no command, the code moves out); an unguarded index in a folder on the clean list of `tools/strict.mjs` (the strictness ratchet: narrow the value); a change in what an example plays (`src/engine/snapshot.txt`: `npx vitest run src/engine/snapshot.test.ts -u` when it is the point, about 10 s, named in the pull request; `-u` before the path takes it as its value and runs every test); a new form (an attribute, a generator, a modifier) on no tier of the tutorial (`src/engine/ladder.test.ts`: put it on a tier in `src/engine/ladder.ts` with a tutorial piece that shows it, or in `PENDING` there until it has one); a vector of the hub's contracts cells no longer meets (`src/contracts.test.ts` over `fixtures/contracts/`: a decision, no command); a MIDI set without its slow test and ratchet file (`src/engine/fold/midi.sets.test.ts`); the folder's ratchets, in the slow tests only (`UPDATE_RATCHET=1`, [testing.md](testing.md)); the boot set, `AGENTS.md` with this page, over 24 KB (`tools/reading-list.ts`: condense it, as a change of its own).

## Language cheatsheet

Details are on the linked pages; this list is only a pointer. → [language/overview.md](language/overview.md); every form at once: [language/reference.md](language/reference.md) (generated from the parser)

- `&name … ` one cell per line; steps `0 2 ~ 4@2 0!4 [0,2,4]` → [cell](language/cell.md)
- `scan(…)` `euclid(k,n)` `sin(n)`; `&t[i]` `&t[$i]` `&t[a:b]` `&t[<<n]` `&t^n` (degrees) `&t^$n` (grid steps) → [braid](language/braid.md)
- `over=&t` `scale(name, tonic)` `shift=n` `cycle=n`; `over=key` the main key (the first `scale(…)`) → [tables](language/tables.md)
- `step=` `loop=` (rates, `&x`, `cycle(&x)`, `*n` `/n`), taps of a meter (`pulse` `beat` `16n` `4n.` `8t` `1m`, `&m:16n`, `cycle=n` bars), `beat=`, swing on the bar (`swing=8n:.67`), `stride=`, `laps=` → [time](language/time.md)
- `map=edo|ed(r)|ratios`, note names → [tuning](language/tuning.md)
- `free(default, lo..hi)`, `free(0 2 4 ~)` a braid, recorded → [free](language/free.md)
- `[a * &voice, …]` mixes (sorts, `+` `*` commute), `map=sample` `postgain=` (its master, linear); a gate `&g play=&tune level=&a*.4 [&lead, &bell]` → [mix](language/mix.md)
- `map=midi` a MIDI card, entries channels; `midi(10)`, `midi(10, 2)` (slot 2) → [midi](language/midi.md)
- voices `s=` `loop=`, `env=` `pitch=` `map=adsr|amp|lin|db`; a line's articulation `legato=.5` (Strudel's) → [sound](language/sound.md)
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
- 010 · A canon's `[<<n]` is a copy (the score replayed); `play= at=` reads what was recorded; a reader of what was played waits for `&<` (#149) · → decisions/010-canon-copies.md
- 012 · A pick is a fixed reader on a turning wheel: `&x[i]` reads the cell as turned (and follows it while it plays), `&x[$i]` as written · → decisions/012-picks-are-taps.md
- 013 · `scale(name, tonic)` is a generator: a fixed mode by name over a key of its own; `shift=` walks its modes, the tonic transposes · → decisions/013-scale-generator.md
- 015 · `&x^n` moves by degrees (`degree(&x, n)`, relative), `&x^$n` by grid steps (absolute, the old `^n`): `$` is the absolute frame · → decisions/015-caret-is-degrees.md
- 016 · Arranging at the input: a section is switched on the meter's bus, declared by a stepped table of names (`&sections step=&bar &keysBar …`) and switched by the selector (it restarts when switched on; it owns only what it steps or loops); the selector of mixes is removed (an error that says what to write); the switch and the gate node stay two mechanisms for now · → decisions/016-arranging-at-the-input.md
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
- 037 · The handshake with Jambot: cells owns the language and the repository of fragments, Jambot the composer and the jam; cells' spellings where they agree with Strudel, Jambot's meanings; Jambot's syntax in flight becomes cells'; a fragment's style is partial, without tempo and entropy · → decisions/037-the-handshake-with-jambot.md
- 038 · Jambot's score rulings, carried over: each of yggi/jambot#7's (a)–(j), #116's (k)–(m) and ledger, and #63's E16, as it stands under 037: holds (where cells says it), overridden (by which row), or open (which issue carries it) · → decisions/038-jambot-rulings-carried-over.md
- 039 · Live MIDI lives in yggi/webmidi (a pure core, a Web MIDI adapter, shared Svelte components); cells keeps MIDI files and when a piece's clock ticks; neither depends on the other · → decisions/039-midi-lives-in-webmidi.md
- 040 · A meter knows its bar, its pulse (the numerator, steady), its beat (what is counted and what bpm counts: 6/8 has 2, 7/8 three unequal) and its tree; lines tap `pulse`, `beat` (×k) or note values (`16n`, `1m`), never the meter cell's own steps, and a tap comes round at the bar; `cycle=n` counts laps (absent: walk, 1: wrap, 0: constant); the language changes freely until v1.0.0 · → decisions/040-pulse-beat-and-laps.md
- 041 · A fragment is cells text and an index entry (an id, an association: weighted style points, axis names to numbers); a query ranks fragments by a weighted distance over the axes it shares with each point, the nearest point divided by its weight; the repository doesn't know the axes · → decisions/041-fragments-by-style.md
- 042 · A swing share (`swing=8n:r`) is a decimal or a fraction of whole numbers, `8n:2/3`, `16n:31/60`: the exact triplet swing in three characters; a level's share only, not yet a bare swing or a `free(…)` · → decisions/042-swing-share-as-a-fraction.md
- 043 · The composer asks the repository first, judges each result against its composition, and generates (and files) what doesn't satisfy it; a fragment's place by association, queries in order (the meter first) that fit the workbench, fragments in groups, one ladder of novelty moved by entropy; a feel (swing, articulation) is one meter fragment · → decisions/043-the-composer-selects.md
- 044 · "Tap" means reading the meter (`step=16n`); a name a selector's table declares is a **section** (`CompileResult.sections`, the examples' `&sections`), a cell reading a net a **reader** (`GraphNet.readers`), a pick a fixed reader · → decisions/044-tap-reads-the-meter.md
- 045 · Node runs `dist/`, the source as JavaScript with resolvable imports (committed, `npm run dist`); bundlers keep the `.ts` through the `module` condition of `exports`, Node takes `default` · → decisions/045-dist-for-node.md
- 046 · Each association point may name the facet it is found as (`meter`, `rhythm`), a hint, not what the fragment can fill (the fit check reads that off its text); a query naming a facet measures those points; `used(ids)` counts each pair used together, and a query ranks by `distance − λ·ln(1 + n)` with what is chosen, λ = 0.1: fewer than 10 uses never reverse fragments 0.3 apart · → decisions/046-facets-and-co-use.md
- 047 · A fragment is a piece with holes (what it uses and defines, derived from its text); fragments combine by a union of lines (a line given twice is one line), and what fits is derived (names defined, clock needs met, the union compiles clean); a facet is a hint per association point; groups are fragments used together; a fragment is a Markdown file (frontmatter: id, association, `source`, `tags`, `created`, `heard`, open-ended; a ```cells block; YAML, a subset parsed in cells; the examples' title and tags move into frontmatter); the seed library is cells', what a jam learns the frontend's · → decisions/047-fragments-are-files.md
