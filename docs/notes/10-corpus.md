# #10, read from the corpus: the examples as evidence

2026-10-07 · open: built through phase 4 (below, *Where it stands*); the ladder and the operator pass to come · [#10](https://github.com/yggi/cell-studio/issues/10), [#9](https://github.com/yggi/cell-studio/issues/9), [#31](https://github.com/yggi/cell-studio/issues/31), [#29](https://github.com/yggi/cell-studio/issues/29), [#35](https://github.com/yggi/cell-studio/issues/35)

A round over the 52 examples with #10's eyes: find the syntax that strains, the paradigms that are missing (swing, drum sequences, phrase assembly), and teach Shorten to see each overcomplication it finds. Read from `main` at 6561beb. This note is the homework before anything changes: what was measured, what each finding is, what it would take, and the decisions it needs. Every claim marked *probed* was compiled and its events compared (scratch scripts over `compileSource` → `plan` → `eventsBetween`).

## Where it stands

**Built** (branch `claude/corpus-refactor-syntax-examples-fd4yad`, each commit with its tests):

| | what | commit |
|---|---|---|
| #9 | Shorten split into `engine/shorten/`, one rule a file; its idempotence tested | 3279ae8 |
| yardstick | `tools/corpus.mjs`: every example's size, Shorten and notes, checked against a base | 3279ae8 |
| F1 | `degree(&x, n)`, `inverse(&x)`, nesting; the laws tested | f47e060 |
| F2 | the finer stepped pitch articulates, the coarser holds | 0860001 |
| F4 | a stepped braid of voices plays them; drum motifs | eefd1fa, f6cd852 |
| F3 | `pan=` back (decision 007) | e483ca1 |
| F6 | a turning table comes round after its length (decision 008) | 761f412 |
| Shorten | degrees, wrappers, progressions, defaults, stereo twins; padding isn't code | 40b7772, ee6339f |
| examples | every note the same: the new forms in 33 pieces | dfa7b46 |
| examples | changed on purpose: pans in 8 pieces (≤ 0.25 dB), Cellscape's one selector, the tresillo on the bar | f2b8fe4 |
| BWV 847 | from its generator: braids of chords, `pan=` (≤ 0.09 dB), no `loop=SAMPLE_RATE` | 8603836 |

Over the corpus: 2,566 characters, 33 lines and 21 cells fewer; the layout's crossings 45.5 → 37.5.

**Found on the way (fixed):** a piece's loop length counted a turning table's entries and ignored `cycle=` (IDM showed 3:30 for 0:30, per tonos 1:40 for 3:20); Shorten offered `&m^k` for a motif without `over=` that its player reads through a scale (grid steps where degrees were meant) — it now checks every table a cell is read through; Shorten's measure counted the spaces that keep comments aligned, so removing an attribute from a commented line saved nothing and hid runs (Bossa, Twinkle, Jazz); `tools/shorten.mjs` stopped on the same.

**Open, for #10 or their own issue:**
- F5 swing: not built. `swing=` still swings only a list meter or `meter()`; the swing clock (`&swing scan(free(2, 1..3) 1)`) is the form the examples use.
- The operator pass (below).
- Grooves: a choice of voices (`[&sd|&cp]`) isn't read yet; a moving `pan=` (an auto-pan) and a kit member that is a resonator don't take a pan yet (decision 007).
- Five: after its rewrite the layout leaves one node overlap (12.7 px); Cellular Brothers and Cellscape each one more tag cluster.
- Still single-piece kludges: Korobeiniki's parts written twice for two harmonies (#29), Pachelbel's entries as gates (the nets thread), Hypercell's chord cells in absolute semitones (`degree(&triad, &prog)`, F1's moving amount).

## The yardstick: how we know a change is better

Pieces will look and sound different when this is done. Before any of that, each change is measured the same way:

- **Sound, when it should stay:** the events of every example (voice, onset, length, frequency, gains; 0–120 s) are identical before and after. This is how #94, #116 and #138 proved their refactors.
- **Sound, when it is meant to change:** the PR lists each example that changes and why, renders it (`cellStudio.measure`) and re-levels `level=` to the convention ([display.md](../language/display.md#level)), and says what to listen for.
- **Code:** characters, lines and cells per example; what Shorten still finds; diagnostics (zero, as now).
- **Graph:** the layout baseline (`quality.baseline.json`: crossings, clusters) may not grow without a reason in the PR.
- **Teaching:** each basic example introduces one concept and uses only what earlier basics introduced (below, *a ladder test*).

## What was measured

**Shorten finds nothing in 51 of 52 examples.** Only BWV 847 has suggestions (8, −696 characters: transposed phrases across the fugue's voices, which `tools/bwv847.py` keeps apart on purpose). Shorten's rules are all at the level of a braid's tokens (runs, phrases, fractions, identical lines), and the examples have been through them. The overcomplications left are structural: whole lines, cells and mixes that say one thing twice. Shorten has no rule that sees them.

**Idioms, counted over `examples/*.cells`:**

| idiom | lines | files |
|---|---|---|
| `loop=SAMPLE_RATE map=sample` (the sound card) | 52 | 52 |
| stereo as two whole chords on the sound card | 20 | 20 |
| 4/4 as `scan(1 1 1 1)` · `scan(27 23 26 24)` · `scan(3 3 3 3)`/`(4 4 4 4)` · `meter()` | 30 · 10 · 2 · 1 | |
| a kick (`s=sine loop=A1 pitch=0..N * &(map=adsr 0 .05 0 0)`), near-identical | 14 | 14 |
| a noise drum (`s=white hpf=…`) | 33 | 18 |
| a vibrato written as a triangle (`pitch=&(map=lin loop=5 0 .1 0 -.1 0)`) | 18 | 15 |
| gates (`map=amp step=…`) | 34 | 15 |
| kits read by number (`over=&kit`, a legend comment for the numbers) | 4 | 4 |
| a motif's own cell, only to read it through a shifted table (`&B over=&lead[<<] &m1 &m2`) | 9 | 6 |
| a stepped table with `cycle=` | 10 | 9 |
| a progression as `loop=&bar*N` summed in the mix | 6 | 5 |
| sections by padding with rests (`~@40`, `&tacetFugue ~@511`) | 9 | 2 |
| chance `?` · choice `[a|b]` · ratchets `*n` · retrograde `[::-1]` · `euclid` | 6 · 7 · 4 · 4 · 2 | 3 · 4 · 3 · 3 · 1 |

**Probes** (each compiled; *events* means compared note for note):

| written | today |
|---|---|
| `&groove step=&bar/2 &bd &hh &bd &hh` (a braid of voices, stepped) | an error: "&groove is a kit … read a pattern through it" |
| `swing=.67` on `scan(1 1 1 1)` | a warning, no swing; on a list meter or `meter()` it swings |
| `&up^1` over a scale | a semitone (`^` is chromatic, after the tables), not a degree *(reversed since by [decision 015](../decisions/015-caret-is-degrees.md): `&up^1` is a degree, `&up^$1` the semitone)* |
| `&m+1` in a braid | an error that lists the other three spellings |
| `pan=` | an error since the seed: "pan= is gone: balance with two mixes" |
| `&b &a` (a copy of a voice) | a kit of one, not a second instrument |
| `(&walk + &changes) * &v` with `&changes step=&bar*4` | an error: "Both would start notes — make one loop=" |
| the same with `&changes loop=&bar*8` | plays: the walk articulates, the changes transpose |
| `&fig over=&chords`, `&chords step=&bar*4 [0,4,7] [2,5,9]` | works: a figure reads the current chord by index |
| the Prelude's `stride=5 cycle=95` table as a braid of 19 chords with `cycle=19` | events identical (without `cycle=19` the second pass climbs an octave) |
| every example without `loop=SAMPLE_RATE` on its sound card | events identical, 52 of 52 |
| `pitch=0...1 * &(map=lin loop=5 0 1 0 -1 0)` | plays with no bend at all, and says nothing |
| `shift=&prog` | an error: a whole number only |

## Findings

Each finding: the evidence, a proposal, what it would break, the Shorten rule that comes with it, and the decision it needs. *Additive* means it gives meaning to what is an error today, so no saved piece changes.

### F1 · Degrees have no spelling of their own (#31)

A motif read a step up its scale needs a cell of its own whose only job is a shifted table: Twinkle's `&mid over=&scale[>>] &down`, Sailor's `&B over=&lead[<<] &m1 &m2`, Lullaby's `&sink`, Five's `&answer`, Pop's `&(over=&major[>>] &hook)`, Zell's four cells `&am &f &c &g` for one shape on four degrees, and Tines' four chord cells that are one rhythm on four degrees. Wrappers like `&scale over=scale(0,5)` exist only so the table can be shifted. `^n` can't do it: it is chromatic, after the tables. #31's second comment already found the rule (a reference's own brackets act in that cell's levels: values, then table, then grid) and the missing level: the values, before the table reads them.

- **Proposal:** `#31`'s values level, spelled so it can't be read as a pick: `&m[k+]` is k + each value (k degrees up), `&m[k-]` is k − each value (inversion round k/2), `&m[-]` = `[0-]`. `&m[-1+]` is a degree down; `&m[-1]` stays the last entry. Additive. Then Twinkle's tune is `&up &down &down[1+] &down[1+] &up &down` and Zell's arpeggio `&shape!8 &shape[5+]!8 &shape[2+]!8 &shape[6+]!8`, and its point, chromatic `^n` beside diatonic `[k+]`, reads on the line.
- **Later, same form:** `k` a cell, `&triad[&prog+]`: a progression of degrees under a fixed chord shape (F7).
- **Shorten:** (R1) a phrase written again k degrees up through the same table becomes `&m[k+]` — today Shorten refuses every phrase read through a scale ("degrees aren't a transposition"); (R2) a cell used once that only reads another through a shifted table (`&B over=&t[<<k] &a …`) is inlined as `&a[-k+]`.
- **Decision (owner):** the spelling.

### F2 · Whether a term articulates depends on writing `step=` or `loop=`

`loop=r` and `step=r·k` are listed as equal spellings (#10 item 2), but in a pitch sum they are not: the `step=` term starts notes, a `loop=` term bends or transposes them, and two `step=` terms are an error. So every progression in the corpus is written `loop=&bar*48` with 12 entries (Jazz), `loop=&bar*32` (Korobeiniki, One more Cell), `loop=&bar*16` (Hypercell), `loop=&bar*5` (Five): the writer multiplies entries by bars to say "one a bar", and Shorten can't run-count `0 0 0 0 5 5 0 0` because the cell's timing is whole-braid.

- **Proposal:** of two stepped pitches in a sum, the finer one articulates and the coarser one holds (transposes), as a melody over its harmony does; two at the same rate stay an error. Then `&changes step=&bar*4 0!4 5!2 0!2 7 5 0 7`. Additive (today it is an error). `gate()` (#35) stays the explicit form for the rare case.
- **Shorten:** (R4) `loop=&x*N` on a term that only transposes becomes `step=&x*(N/k)`, then runs and fractions apply.
- **Decision (owner):** the rule (finest articulates), or an explicit gate only.

### F3 · Stereo is written by writing the mix twice

20 examples put two whole chords on the sound card that differ only in their gains: Ghost-Cells' line is seven entries twice; Cellscape needs 12 mixes, two tables of layers and two selectors (20 lines) to say "this layer a little left". `pan=` was retired at the seed in favour of "two mixes".

- **Proposal:** a balance on the voice, `pan=` in dough's sense (0 left, .5 centre, 1 right; it can move, `pan=0..1 * &lfo`), desugared at compile time into today's two channel gains, so a panned mono chord plays exactly what the two chords play now (the gains can be matched exactly). Two chords stay valid. Reverses a recorded choice, so it needs a decision record.
- **Shorten:** (R7) two sound-card chords with the same entries and different gains become one chord and a `pan=` per voice (exact).
- **Decision (owner):** bring back `pan=`, a `map=pan` cell (a stereo volume, a factor of the product), or keep two mixes.

### F4 · Drum sequences are numbers with a legend

Sailor, IDM, Cellular Brothers and Automaton read a kit by number, each with a comment saying `0 kick, 1 snare, 2 hat`. A braid of voices with `step=` is an error today.

- **Proposal:** a stepped braid of voices plays them: `&groove step=&bar/4 &bd ~ &ch &ch*2 &sd ~ &ch &bd`; chords of voices (`[&bd,&ch]`), ratchets, chance and choice work as in any braid. A kit (unstepped) stays a table. Additive. Per-instrument gate rows (`&kick map=amp …`, the 808's grid) stay the form for accents.
- **Shorten:** none (it is clearer, not shorter); the examples move by hand.
- **Decision (owner):** yes or no.

### F5 · Swing has three answers

`swing=` swings a list meter or `meter()` but not a scan (a warning); Jazz, Five and Coltrane make swing a clock of their own, `&swing scan(free(2, 1..3) 1) step=&bar/2`, and step on it; the Metronome is the only user of `swing=`.

- **Proposal:** the swing clock is the one model (it is shared by the band, it is a slider, it is a cell); `swing=` becomes shorthand for it or retires with a migration message. A basic example of its own (F12).
- **Decision (owner):** keep `swing=` as shorthand, or retire it.

### F6 · Turning climbs by default, so every turning table says `cycle=`

All 10 stepped tables in the corpus write `cycle=`, and 7 of them write their own length (`stride=7 cycle=12` on the 12, `cycle=7` on a scale, `cycle=95` and `cycle=280` on the chord tables). The probe above shows the trap: a braid of chords without `cycle=19` climbs an octave on its second pass. Climbing is what Per tonos and the Ricercar want (`cycle=24`), and IDM turns only twice (`cycle=2`).

- **Proposal:** a stepped table comes round after its own length unless `cycle=` says otherwise. Breaking for a saved piece that relies on climbing without `cycle=` (no example does). Touches decision 003's area.
- **Shorten:** (R6′) `cycle=` equal to the table's length is dropped.
- **Decision (owner).**

### F7 · Tables of chords are written as one long table with a stride

The Prelude (`stride=5 cycle=95`, 95 numbers) and BWV 847 (`stride=4 cycle=280`) flatten a table of chords into one table and turn it by a chord's width each bar. A stepped braid of chords already reads by index (probed), and the Prelude rewritten so plays identical events.

- **Proposal:** rewrite both (no language change). With F6 the `cycle=` goes too.
- **Shorten:** (R5) a stepped table whose `stride=k` divides its length into groups becomes a braid of `[…]` chords (exact; checked note for note before it is offered, as turns are today).

### F8 · Boilerplate that says nothing

- `loop=SAMPLE_RATE` on every sound card (52/52) changes nothing (probed). Keep it as a teaching line in the first basic, drop it elsewhere, or make it the default in the docs. (R6) Shorten drops it.
- 4/4 is spelled four ways. One canonical bar for the basics, `scan(1 1 1 1)`; the bent bar `scan(27 23 26 24)` only where the feel is the point (today it is in four basics, where it is a distraction: #10 item 7). (R3) Shorten: a scan whose intervals share a factor and whose values nothing reads becomes the reduced scan; runs inside generators, `scan(1!4)`.

### F9 · Voices are instances; the same patch is written twice

Cell Phase has `&mL`/`&mR` and `&pianoL`/`&pianoR`, identical lines, because two players need two instruments (filters are one per voice, [limits.md](../limits.md)); Tines has two identical modulators. `&pianoR &pianoL` makes a kit, not a copy. Shorten's "the same" rule rightly skips voices (merging them would share a filter).

- **No proposal yet:** whether a product (a junction, nets decision 2) is an instance of its voice is the nets thread's question. Recorded for #10 and limits.

### F10 · Coupled tempos are written as numbers

Meter and rhythm's tresillo is `step=75bpm` beside `&bar … step=free(100bpm, 70..140)`: they agree only at 100 bpm, and drift apart as soon as the slider moves (by arithmetic: at 70 bpm the bar is 3.43 s, the tresillo still 2.4 s). The fix is `step=&bar*4/3`.

- **A warning to add:** a clock with a fixed rate in a piece whose other clocks hang off a `free()` tempo.

### F11 · Other kludges in single pieces

- Pachelbel's entries are amp gates `&(map=amp step=cycle(&ground) 0 1!11)`, four of them; Canon enters by rotation. Entries and delays are the nets thread's open question (`[<<n]` versus a tap at a delay, `&<`); left there.
- Korobeiniki writes every part twice (A and B) because the harmony is baked into the parts; a selector in a melody's position is #29.
- Ricercar sequences its passes by padding with rests (`~@40 &first ~@40 …`): a selector says it.
- Names that mislead: Sailor's `&lead` is its scale; Waveforms names cells after `s=` words (`&saw`, `&tri`), #10 item 7.
- `pitch=lo..hi * &shape` with a `map=lin` shape plays no bend and warns nothing (probed): a bug to file.
- 14 kicks, 33 noise drums and 15 vibratos are near copies across files: a piece is self-contained, so there is no shared instrument. Recorded as a gap, no proposal.

## Shorten: what to teach it, from the findings

| rule | from | needs |
|---|---|---|
| R1 a phrase k degrees up → `&m[k+]` | F1 | the `[k+]` form |
| R2 a single-use shifted-table wrapper → inlined `&a[k+]` | F1 | the `[k+]` form |
| R3 reduced scans, runs inside generators | F8 | — |
| R4 a transposing `loop=&x*N` → `step=` | F2 | the articulation rule |
| R5 a strided table → a braid of chords | F7 | — |
| R6 `loop=SAMPLE_RATE` and a `cycle=` equal to the length dropped | F6, F8 | F6 for the second half |
| R7 stereo twins → one chord and `pan=` | F3 | `pan=` |
| also | #10 item 4 | Shorten's idempotence as a test; its fraction rule reading `/d*n` and `cycle()` (#10 item 2) |

**#9 on the way:** `compress.ts` is 364 lines with five rules and their shared harness (candidates, measuring, `sameNotes`) in one file. Before adding rules: split it as the parser and compiler were, `engine/shorten/` with one file per rule and the harness, no change in behaviour (every example's suggestions identical). Then each new rule is one file and one test.

## The basics: one concept a file, MECE

Today 15 examples carry the `basics` tag. Several teach three or four things at once (the Metronome: `meter()`, `free()` with names, `swing=`, a kit, pitch drops), several concepts have no basic at all, and none teaches the next one's prerequisites first.

**Concepts with no basic today:** chance and choice (`?`, `[a|b]`, `seed=`) · retrograde, slices and picks · ratchets and `euclid` · drums (kits) · swing · chords and a progression · arrangement (parts, selectors, `laps=`) · moving parameters (`lpf=lo..hi * &env`, knobs) · grids by `map=edo` (no example uses it) · tape · belts · FM.

**A proposed ladder** (each rung one concept, using only the rungs before it; names are placeholders):

| # | concept | file |
|---|---|---|
| 1 | steps: numbers, rests, holds, repeats, a rate | new (a tune on one line) |
| 2 | a clock: a bar, `step=&bar`, `/2` `*2` | Metronome, simplified (no `meter()`, no kit) |
| 3 | a voice: `s=`, note names, `env=`, `lpf=` | new |
| 4 | tables: `over=`, `scale()`, `shift=` | Key and mode |
| 5 | motifs: splicing, reuse, `[k+]` | Twinkle |
| 6 | chords and a progression | new (Pop's four chords, without the arrangement) |
| 7 | meter and feel: a scan as a bent bar, gates | Meter and rhythm (the tresillo on `&bar*4/3`) |
| 8 | drums: a groove of voices, ratchets, `euclid` | new |
| 9 | swing: a swing clock | new |
| 10 | canon: rotation, `[<<]` | Canon |
| 11 | mirrors: retrograde, slices, inversion `[-]` | new |
| 12 | chance and choice | new |
| 13 | turning tables: `stride=`, `cycle(&x)` | the circle of fifths |
| 14 | arrangement: parts, a selector, `laps=` | new (small) |
| 15 | stereo | Stereo |
| 16 | waveforms from braids | Waveforms |
| 17 | moving parameters: envelopes and knobs on a filter | new (Acid, small) |
| 18 | tuning: grids (`edo`, `ed(r)`, `ratios`) | Alpha (and Just as a piece) |
| 19 | `free()`: sliders and named choices; `meter()` | the Metronome's current form |
| 20– | physics, one each: a motor (Music Box), a belt, a tape (Echo Tape), a resonator (Kalimba, Forks), FM, a scope (Harmonograph), text (DTMF) | existing, trimmed |

Bell and scale, Just and Two Tuning Forks read better as pieces than as rungs (each joins two ideas on purpose).

**A ladder test** (proposed): which features each example uses can be read from what it compiles to (generators, modifiers, attributes, mix forms). A test can then check that rung n introduces its concept and uses only what earlier rungs introduced, and that every feature in `docs/language/reference.md` has a rung: MECE, enforced instead of hoped for. It needs a `rung=` (or an order) on the basics, a display attribute like `level=`.

## Order of work, proposed

0. This note (no code).
1. #9: Shorten split into `engine/shorten/`, idempotence test, the yardstick script (events and metrics of every example, before/after). No behaviour change.
2. The owner's decisions on F1–F6 (one record each in `docs/decisions/`, a line in MEMORY.md).
3. The additive forms, each with its Shorten rule and tests: `[k+]`/`[k-]` (F1, closes #31), the articulation rule (F2), a stepped braid of voices (F4), then `pan=` (F3) and the default `cycle=` (F6) if decided.
4. The examples moved to the clean forms, a few at a time, each PR with its list of what changes sound and why; F7, F8, F10, F11's single fixes.
5. The ladder: the new basics, the trimmed old ones, the ladder test, `docs/examples.md` regenerated.

## Decisions (owner, 2026-10-07)

1. **F1 · named operations now, operators later, in one pass.** `degree(&x, n)` (n steps up the table it is read through) and `inverse(&x)` (mirrored round the first degree), nesting (`degree(inverse(&x), 4)`): built, with the laws tested (`engine/operations.test.ts`). They give the meaning; a short spelling (the owner's sketch: `&x~1`, `&x~-1`) is chosen for every operator together, below, not one at a time.
2. **F2 · articulation:** of two stepped pitches in a sum, the finer one articulates and the coarser one transposes; two at the same rate stay an error.
3. **F3 · stereo:** `pan=` on a voice, in dough's sense (0 left, .5 centre, 1 right), compiled into the two channel gains. Reverses the seed's "two mixes": a decision record.
4. **F6 · turning:** a stepped table comes round after its own length unless `cycle=` says otherwise. Amends decision 003's area: a decision record.

Taken as recommended unless the owner says otherwise: F4 (a stepped braid of voices plays them), F5 (`swing=` becomes shorthand for a swing clock), F8 (`loop=SAMPLE_RATE` only in the first basic), the ladder with its test.

In the findings above, read `&m[k+]` as `degree(&m, k)` and `[k-]` as `degree(inverse(&m), k)`.

## The operator pass (to come, one decision)

Every operator the language has or is about to get, so their spellings are chosen together and stay one system. Named forms (like `degree`, `inverse`) define the meaning; an operator is shorthand for one.

| space | operation | today | named form |
|---|---|---|---|
| a step | repeat · ratchet · hold · chance | `x!n` · `x*n` · `x@n` · `x?p` | — |
| a braid, as written | pick · slice · retrograde | `&x[i]` · `&x[a:b]` · `&x[::-1]` | — |
| a braid, in time | rotate (climbing) | `&x[<<n]` `&x[>>n]` | — |
| its values, before the table | degree · inversion | — | `degree(&x, n)` · `inverse(&x)` |
| the grid, after the table | transpose | `&x^n` | — |
| a table read | shifted | `over=&t[>>n]` | — |
| semitones, in a mix | add · subtract · product | `+` `-` `*` | — |
| time, on a clock | faster · slower · per cycle | `&x/n` `&x*n` · `cycle(&x)` | — |
| a net | tap · send (nets thread) | — | `&<x` · `&>x` (sketch) |

Questions for the pass: one character per space or words throughout; whether `[<<n]` on a melody stays time (the canon) when degrees get a sign of their own; whether a mix may take degrees at all; how a moving amount is written (`degree(&triad, &prog)`, F1's progression).

