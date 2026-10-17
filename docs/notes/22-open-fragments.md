# Open fragments: a fragment that leaves `&bar` and `&key` to the host

Date: 2026-10-17 · Status: a proposal, measured; the recommendation goes to the owner, and the build is a later issue · Issues: [#22](https://github.com/yggi/cells/issues/22) (its first step), the central roadmap [#81](https://github.com/yggi/cells/issues/81) (the rung *Open fragments*), the seam [yggi/jambot#309](https://github.com/yggi/jambot/issues/309) ("open fragments that leave `&key` and `&bar` to the host") · Probe: `tools/open-fragments.ts`, held by `tools/open-fragments.test.ts`

The question: how a fragment names a cell it doesn't hold (`&bar`, `&key`), how the host supplies it, and what happens when it doesn't.
The answer measured here: **taps already did most of it.**
A fragment whose lines tap (`step=16n`) names no meter at all, so it is open on `&bar` today; the host's `&bar` line, put in the same text, is its main meter.
A fragment over a key names `&key` and declares none; the host's `&key` line fills it.
Both play exactly what the text written whole plays, on all three cases, with no change to `src/`.
What taps don't solve is two fragments with the same names on one workbench; that is a job for the repository, not for a new form.

## What the code does today

- **A host passes numbers.** `Env` (`src/engine/program.ts:417-422`) holds `SAMPLE_RATE`, `A4` and any other name with a number, read by `step=NAME`; it holds no cells.
- **An undeclared cell is an error**, "Unknown cell &key" (`src/engine/compiler/context.ts:31`), and the piece doesn't play.
- **A tap reads the piece's main meter** when it names none ([decision 040](../decisions/040-pulse-beat-and-laps.md)): the first meter in the text with a tempo of its own (`src/engine/compiler/clocks.ts:115`). With none: "step=16n taps the piece's main meter, and it has none" (`clocks.ts:127`).
- **A cell given twice is an error**, "&bar is already defined on line n" (`src/engine/compiler/declare.ts:31`): there is no way today for a fragment to state a cell the host may override.
- **A meter fragment is already open on its tempo** ([decision 041](../decisions/041-fragments-by-style.md)): its text is `&bar meter(…)`, and the host sets `step=` (`setTiming` in `src/engine/edit.ts`).

## The options

Each is emulated in the probe, on the text or on the parsed cells, where it would need a change to `src/`.

- **(t) Taps, no form.** The fragment taps and names no meter; a fragment over a key names `&key`, an agreed name. The host's lines and the fragments' text are one text. Unfilled: the compiler's own two errors above. Change to `src/`: none. The probe: `byTaps`, 3 lines.
- **(a) An `Env` that carries cells.** The host passes `{ bar: '&bar meter("7/8") step=108bpm' }` beside the numbers, and compile adds each cell the fragment doesn't declare, ahead of its own (so the host's meter is the main one). Unfilled: as (t). Change to `src/`: `Env`'s index type (`[name: string]: number`) widened, so both frontends' typechecks move (Cell studio imports `Env` in `src/audio/engine.ts:10`); compile parses the host's cells and joins them, about 15 lines; and diagnostics from two texts share one `Span` (a line and a column), so an error in a host line points into the fragment unless a span learns which text it is in. A `Meter` value in place of text is worse: a second spelling of a meter, outside any text. The probe: `byEnv`, the two texts parsed apart and their cells joined before `compile`.
- **(b) A declaration in the fragment.** `&bar host` leaves `&bar` to the host; `&key host scale(dorian, D)` with a default after it. The host's line takes its place, else the default, else an error ("&key is left to the host, and the host gave none"). Change to `src/`: a flag like `off` in the parser (today: "Unexpected 'host'"), its substitution in `declare.ts`, the tutorial ladder and the reference (a new form: `src/engine/ladder.ts`), and still a way to hand the host's lines over, which is (t) or (a). About 80 lines with docs. The probe: `byDeclaration`, on the text.
- **(c) Imports, or a library by hash.** The host's text names a fragment by its id, `&drums use="funk drums"` (its hash once [#49](https://github.com/yggi/cells/issues/49) has one): the fragment's text comes in, the cell no other of its cells reads (its output) named `&drums`, every other cell it declares prefixed (`&drums_kick`), and what it reads without declaring (`&key`, the main meter) left to the host. The line's other attributes go on the output, so a meter comes from the repository with the host's tempo: `&bar use="7/8" step=104bpm` is `&bar meter("7/8") step=104bpm`. Unfilled: as (t). Two variants: **every cell renamed**, and **voices kept** (a voice keeps its name, since MIDI out reads a drum's note off it, `gmDrumNote` in `src/engine/midi.ts`, and a line that comes in word for word twice is one). Change to `src/`: as a language form, `use=` and a library inside a compiler that is pure and holds none; as a function of the repository that writes the expanded text, none in the language and about 50 lines in `src/repository/`. The probe: `namespaced` and `byImport`, on the text.

## The cases, measured

The texts are Jambot's own, lifted from E33 (yggi/jambot `packages/score/experiments/bar-in-cells.ts` @ d225286, seed 0, entropy 0.3, bar 0): Funk's drums and bass in 4/4, Synth-pop's drums in 4/4, and the witness bar of E33, Synth-pop in 7/8, split into the host's lines (meter, key, harmony, MIDI card) and three fragments (drums, bass, comp).
Each comparison listens 8 bars of 4/4 at 104 bpm (18.5 s) and compares every note: voice, onset, length, pitch, level, channel gains, MIDI card entries and the General MIDI drum note its voice's name gives, to 9 digits.
The text written whole puts the host's lines first, as E33 writes a bar; option (t) puts them after the fragments, so the order is part of what is compared.

1. **A drum fragment with `&bar` open**: Funk's drums (every role, the rim a Euclid on `1m`), filled by 4/4, by 7/8 (3+2+2, `meter("7/8")`), and by 7/8 as 2+2+3 (`meter("*.+.+..")`: no signature names it until [#17](https://github.com/yggi/cells/issues/17)).
2. **A bass line with `&key` open**: Funk's bass (degrees of `&key` from C1, on `16n`), filled by its own key, D dorian, then by A aeolian.
3. **Fragments sharing one host `&bar`**: E33's witness rebuilt from the host's lines and its three parts, all tapping the host's 7/8 and reading its `&key`; then two drum fragments layered on one 4/4, Funk's and Synth-pop's, which share their roles' names (`&kick`, `&hat`) and their voices (`&bd`, `&hh`). Written whole, the layered pair is what a person would write: the roles renamed apart, the kit once.

```sh
node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/open-fragments.ts
```

prints these tables (under a second):

| case | fill | (t) taps | (a) env | (b) declared | (c) imported | (c) imported, voices kept |
|---|---|---|---|---|---|---|
| 1 drums | 4/4 | equal, 152 notes | equal, 152 notes | equal, 152 notes | differs: 152 of 152 notes | equal, 152 notes |
| 1 drums | 7/8 (3+2+2) | equal, 185 notes | equal, 185 notes | equal, 185 notes | differs: 185 of 185 notes | equal, 185 notes |
| 1 drums | 7/8 (2+2+3) | equal, 185 notes | equal, 185 notes | equal, 185 notes | differs: 185 of 185 notes | equal, 185 notes |
| 2 bass | scale(dorian, D) | equal, 24 notes | equal, 24 notes | equal, 24 notes | equal, 24 notes | equal, 24 notes |
| 2 bass | scale(aeolian, A) | equal, 24 notes | equal, 24 notes | equal, 24 notes | equal, 24 notes | equal, 24 notes |
| 3 shared | 7/8 (E33) | equal, 137 notes | equal, 137 notes | equal, 137 notes | differs: 78 of 137 notes | equal, 137 notes |
| 3 layered | 4/4 | 8 errors | 8 errors | 8 errors | differs: 208 of 208 notes | equal, 208 notes |

- **Every option fills a single fragment exactly**, and the order of the host's lines doesn't matter, as long as no fragment brings a meter with a tempo of its own (below).
- **Renaming every cell loses the drums' notes**: a voice `&drums_bd` is no longer a kick to MIDI out (`gmDrumNote` reads the name), so every drum hit differs in its note and in nothing else; the bass's voice has no General MIDI name, so it doesn't. Voices are the shared instruments, and an import keeps their names.
- **Two fragments with the same names collide** wherever the fragments are joined as they are: 8 names given twice (the 4 roles and the 4 voices), and nothing plays. Only an import keeps them apart. A rule that a line given twice word for word is one line would remove the 4 voices' errors and leave the 4 roles'.
- **The comparison can fail**: the test fills with 4/4 against the text written in 7/8, and with D dorian against A aeolian, under each option, and each differs (the law of meaningful tests).

Two things the cases found that #22 didn't ask:

- **An open `&bar` fits any meter as text, not as music.** Funk's drums are 16 sixteenths. In 7/8 each line still walks its 16 steps across bar lines of 14, so the kick strikes 4 downbeats in 14 bars (in 4/4, 14 of 14); a `1m` Euclid squeezes its 16 steps into the bar. A drum fragment re-lays itself in another meter only if it is written in the meter's counts (`beat`, `pulse`, a subdivided `1m`), or one fragment is written per meter, as E33's band writes 14-step lines in 7/8. Whether a line longer than its bar should come round at the bar line is a question of what the language means, not of open fragments: [#116](https://github.com/yggi/cells/issues/116).
- **The main meter is the first meter in the text with a tempo** (`clocks.ts:115`), so a fragment that brings a meter with a tempo of its own (a clave on `&clave meter("4/4") step=90bpm`) placed before the host's `&bar` becomes the main meter, with no diagnostic (run once in a scratch script: `mainMeter` was `clave`, no diagnostics). With (t), the host's lines come first; a fragment of the repository carries no tempo (decision 041), so a meter in it is no clock and can't take over.

## What an unfilled cell does

The bass fragment (open on the main meter and on `&key`) with nothing from the host:

| option | errors | plays |
|---|---|---|
| (t), (a), (c) | "Unknown cell &key"; "step=16n taps the piece's main meter, and it has none: write one (&bar meter("4/4") step=100bpm)" | no |
| (b) | the two above, after "&bar is left to the host, and the host gave none" and the same for `&key` | no |
| (b) with defaults (`&bar host meter("4/4") step=104bpm`, `&key host scale(dorian, D)`) | none | yes, in D dorian |

**Recommended: an error, no default.**
The compiler's two errors already say what is missing, and the meter's says what to write.
A default stated in the fragment would play a bass in its own key under a host that forgot to give one, silently; a fragment's style point holds no key either (Jambot's axes have none, and decision 037 leaves tempo out of a fragment's style), so the default would be a guess.
The defaults belong to the host: the composer asks the repository for a meter and a key before it asks for the parts that read them.

## The repository

A fragment is stored as decision 041 says, `{ id, text, association }`, with its text open, as a meter's is open on its tempo:

```ts
{ id: 'funk bass', text: '&bass over=&key step=16n 7@10 14@3 7@3\n…\n&bassV loop=C1', association: [{ point: FUNK, weight: 1 }] }
```

- **What it leaves open is read off its text, never stored**: a line that taps without naming a meter (on its step, or a time read as a tap, `delaytime=8n`) when the text has no meter of its own, and each cell it names without declaring. The probe's `openNames` gives `funk drums`: the main meter; `funk bass`: the main meter and `&key`; E33's comp: the same. It reads the meter off the parse, not the diagnostics: a line that fails on `&key` first never says it has no meter.
- **A query returns what it returns today**, the k nearest fragments with their distances; the host fills each by putting its lines in the same text. When the query that takes the workbench's parts is built (#81's concept), it can pass over a fragment that leaves open what the workbench doesn't hold.
- **A meter fragment is the host's `&bar`**: case 1's imported rows take it from `METER_FRAGMENTS` by id with the host's tempo, and play as `meter(…)` written by hand.

## Recommendation for the owner

1. **Open fragments are (t): a fragment taps and names no meter, and names `&key`; the host's lines and the fragments' text are one text, the host's lines first.**
   It changes nothing in `src/` (0 lines), passes all three cases exactly, and keeps the text the single source of truth: what plays is one text, which a workbench can show and Shorten can read.
   Jambot's seam writes its section as the host's lines (meter, key, harmony, card) followed by each part's fragment, which is how E33's `barAsCells` already orders a bar; Cell studio changes nothing.
2. **An unfilled cell is an error**, the compiler's own; no default form.
3. **The repository stores an open fragment as it stores any** (decision 041, unchanged), and derives what it leaves open from its text (`opens(text)`, about 20 lines and a test in `src/repository/`) when the workbench-aware query needs it, not before.
4. **Two fragments that share names are imported, by the repository, not by the language**: a function that writes the expanded text, each fragment's cells under the name it is used as, its voices kept, a line repeated word for word once (about 50 lines in `src/repository/`), built with the rhythms library (#81's rung *Rhythms as fragments*, #49), which is the first to put two fragments of one kind on a workbench. Its ids become hashes with #49's canonical form.
5. **Not (a)**: cells outside the text, so no one text is the piece; two texts' diagnostics on one kind of span; and `Env`'s type moves for both frontends. **Not (b)**: a new form saying what taps already say for `&bar`, and its default is the silent wrong key above.

Open for the owner:
- **`&key` as an agreed name, or a main key as there is a main meter.** A line over the piece's key (`over=key`, bare, as `step=16n` is bare) would read the first `scale(…)` in the text, so a bass fragment would name nothing, as a drum fragment names nothing. It is decision 040's rule one level over (pitch as time), and a change to the parser (`over=` takes a cell or `scale(…)` today: "Expected a cell or scale(name, tonic) after over=") and to the compiler. Measured only as far as (t): after the rewrite to `over=&key` it is (t).
- **The rule for a line given twice word for word** (one line, not an error): it would make layering easier under (t) too, and moves no example (an error becomes no error); it is a change to what the language accepts, so it is the owner's.
