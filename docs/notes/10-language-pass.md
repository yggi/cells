Moved from yggi/cell-studio docs/notes/10-language-pass.md @ 4036a0b; its issue numbers (#n) are Cell studio's.

# The language pass: more with less, on top of Strudel

Date: 2026-10-12 · Status: open (round 2: the owner's answers, §6–8) · Issue: [#10](https://github.com/yggi/cell-studio/issues/10); the pass's threads are [#337](https://github.com/yggi/cell-studio/issues/337) (Strudel), [#179](https://github.com/yggi/cell-studio/issues/179) (operators), [#151](https://github.com/yggi/cell-studio/issues/151) (canonical forms)

The owner's brief: another pass over the language itself (#10, #179, #250, the scalogram work). Aim for a language that can say more with fewer forms. Consolidate the issues. Don't force decisions: follow the invariants first. Align with Strudel and dough where possible, because cells sits on top of them as TypeScript sits on JavaScript.

Read from `main` at 7d4b4b6. Three reads went into it:
- every open language issue and its comments, with its claims re-run on `main`;
- Strudel's and dough's source (the mini-notation grammar `krill.pegjs`, `controls.mjs`, `dough.h`);
- the scalogram and multiscale notes.

## 1. The invariants, already decided

These answer most of what is open, so they come first. Every row below says which one it follows from.

| | invariant | where it is decided |
|---|---|---|
| I1 | The text is the one source of truth; a graph edit rewrites a line. | [architecture.md](https://github.com/yggi/cell-studio/blob/main/docs/architecture.md), AGENTS.md |
| I2 | One meaning per spelling. Several spellings may mean the same thing, but one of them is canonical and the tools write it (Shorten while writing, Normalise over a corpus). | roadmap target 3, [decision 017](../decisions/017-shorten-and-normalise.md) |
| I3 | Nothing fails silently. | roadmap target 4 |
| I4 | A cell's sort comes from its own line, never from where it is written; `+` and `*` commute. | [decision 006](../decisions/006-mix-algebra.md) |
| I5 | `$` is the absolute frame; unmarked is relative. | decisions [012](../decisions/012-picks-are-taps.md), [015](../decisions/015-caret-is-degrees.md) |
| I6 | A named form defines the meaning; an operator is its shorthand. | [#179](https://github.com/yggi/cell-studio/issues/179) |
| I7 | Every port has a band (sync, CV, audio); its units, and whether it can move, follow from the band. | [notes/nets.md](nets.md) (the model); [#150](https://github.com/yggi/cell-studio/issues/150) (building it) |
| I8 | The examples sound the same; anything that could change a saved piece is the owner's call. | AGENTS.md, roadmap target 5 |

**I9, accepted ([decision 027](../decisions/027-on-top-of-strudel.md)): cells is a superset of Strudel's mini-notation.** Where a step form is spelled as in Strudel, it means what it means in Strudel. Cells adds to that (cells, tables, the helix, sorts, nets): the "types" on top. It never gives a Strudel spelling another meaning. This is the TypeScript rule: valid JavaScript is valid TypeScript with the same meaning. I9 says nothing about Strudel's method chains or its global `cps`, which are another model, not a spelling. Sound parameter names extend I9 to dough and Strudel: a name they share with cells means the same, and their aliases may be read, with Normalise writing one spelling (I2).

## 2. Where cells stands against Strudel and dough

Details and sources: [#337](https://github.com/yggi/cell-studio/issues/337). Checked in source: Strudel `main` 2026-10-12, dough f926606. What dough is today: Felix Roos' C/WASM synth (`dough-synth`), an optional output of Strudel (`.dough()`). Strudel's default engine is still superdough. Parameter names are Strudel's `controls.mjs`; dough reads most of them.

**Same spelling, same meaning (keep):**
- step modifiers: `~`, `x!n`, `x@n`, `x*n` (a ratchet is Strudel's fast step)
- `[a, b]` chords, `[a|b|c]` choice
- `euclid` patterns (identical for every k < n ≤ 16)
- seeded chance
- `s=`, `lpf` `lpq` `hpf` `hpq` `room` `delay` `delaytime` `delayfeedback` `pan` `crush`
- `free()` ≈ `slider()`, written back into the code

**Conflicts with I9.** These are spelled as in Strudel but mean something else. Each count is over the 76 examples.

| form | cells | Strudel | examples relying on cells' meaning | cost of aligning |
|---|---|---|---|---|
| `[a b]` | a chord (the comma optional) | a subsequence: the steps squeezed into one | **0** (3 tests) | low, and it **adds** subdivision, which cells lacks |
| `euclid(k,n,r)` rotation | turns left (as Tidal) | `x(k,n,r)` turns right | **0** use the third argument | low |
| `x?p` | sounds with probability p | dropped with probability p (`degradeBy`) | 3 pieces, 9 steps with a number | a silent change for saved pieces; ⚖ owner |
| `_` | in `base=`: keep the base's step (decision 026, 1 piece) | elongate the step before it (`a _ _` = `a@3`) | 1 | cheap now, costly later; ⚖ owner |
| `x%n` (#306, a draft) | a step's own level | `{…}%n`: steps per cycle in a polymeter | 0 on `main` | **free until #306 merges**; ⚖ owner |
| `legato` (#306, a draft) | a flag: tied notes play as one, bent | a number: a note's length against its step | 0 on `main` | **free until #306 merges**; ⚖ owner |
| `step=&x*n` | **slower**: once per n | `*n` faster, `/n` slower (`fast` / `slow`) | 44 pieces | high: old and new both parse, so a saved piece can't be migrated by machine; ⚖ owner |

The last row is also a conflict inside cells: on a step `x*n` is faster (a ratchet), but on a clock `&x*n` is slower. That's one sign with two directions in the space of time, against I2. Keeping it, and documenting it next to Strudel's, is a sound choice. The cost is what the owner weighs.

**Missing, and additive under I9** (no saved piece changes; each extends the step grammar):
- `<a b c>`: one per lap, an alternation
- `x/n`: a step slowed over n laps
- `x(k,n,r)`: an inline euclid
- `scale("D:minor")`, and tonal's scale names (`minor:pentatonic`, `harmonic:minor`), beside `scale(minor, D)`
- `saw(n)` `tri(n)` `square(n)` beside `sin(n)`
- Strudel's and dough's parameter aliases (`sound` `cutoff` `resonance` `verb` `delayt` `delayfb` …) read as synonyms, with Normalise writing ours. Today they are errors (#143). Under I2 they can be read, because I2 forbids two *meanings*, not two spellings.

**Different models (keep, and say so).** These differ in model, not in spelling, so I9 doesn't touch them:
- per-cell clocks against a global `cps` (`loop=` on a meter is Strudel's cps)
- `[<<n]` climbs a lap where `early` doesn't (the slice form `&x[-1:] &x[:-1]` is `early`)
- `fm=` names a cell; `index`/`ratio` are Strudel's `fmi`/`fmh`
- loudness as products and `level=`, against `gain`/`velocity`/`postgain`
- `lpq` in Strudel's units (Q), not dough's 0–1; `distort` on another scale than dough's
- no samples

These belong in a "for Strudel users" section of [overview.md](../language/overview.md).

## 3. Less complexity: four primitives as the lens

[multiscale.md](multiscale.md#disentanglers-towards-a-minimal-grammar-10-179) proposes four primitives that may generate the language: **look up**, **dilate**, **shift with carry**, **combine** (with soft time a possible fifth). Read the open questions that way, and most of them are one family each with too many spellings, or one missing entry in a grid:

| primitive | cells today | redundancy or gap | follows from |
|---|---|---|---|
| **look up** | `over=`, a kit read by number, a gate's `play=` on a kit, a selector `over=&parts`, `map=&table`, picks `&x[i]` | the gate's `play=` and `over=` are one lookup with two spellings ([gate-example.md](https://github.com/yggi/cell-studio/blob/main/docs/notes/gate-example.md)); one drum hit has three spellings (#10's examples pass) | I2 → #151 |
| **dilate** | `step=`, `loop=` (three meanings), `cycle(&x)`, `&x*n` `/n`, `@n`, `x*n`, `laps=` | `*` points two ways (above); no slowed step (`x/n`, Strudel's) | I2, I9 → #337, #151 |
| **shift with carry** | `shift=`, `stride=`, `[<<n]` `[>>n]`, `^n`, `^$n`, accidentals on a number | a grid of {relative, `$` absolute} × {time, degree, grid}. The missing cells: `$` on a rotation, an accidental on a reference (`&x[0]#`), a moving amount (`degree(&triad, &prog)`) | I5, I6 → #179 |
| **combine** | chords, `+` `*` in a mix, splices, `base=` overlays, groove chords | `level=` has three meanings (dB on the card, linear on a gate and on a voice in #306); section mixes are gone but nothing stops them | I2, I7 → #150 |
| *soft time* | `swing=`, `wow=`, `varispeed=`, a tape's `at=` | `swing=` does nothing on a `scan` (a warning now); the examples use a swing clock | I2 → #151 (F5) |

**The test.** Express every row of [reference.md](../language/reference.md) in the four primitives, and list what doesn't fit. The rows that fit twice are #151's families. Their canonical forms are the list Normalise writes (#244, decision 017). That gives #151 a method in place of a list of opinions.

**More power, from the same four:** subdivision `[a b]`, alternation `<a b>`, a slowed step `x/n` (dilate); the moving amount and `$` everywhere (shift with carry). Each is a gap in a grid the language already has, not a new idea.

## 4. What the scalogram says to the language

From [scalogram.md](scalogram.md) and #286. The language changes nothing by it; these are evidence and suggestions for the tools.

- **The code's levels are heard.** 73 of 75 pieces have a ridge on a cell's step or turn, and 132 of 256 ridges match a cell. Most of the rest sit at a half or a third of one (harmonics).
- **Boundaries are heard at splices.** Of the boundaries heard but not written as sections, 15 land on a braid splice, against 8.4 by chance. The splice tree is the piece's account of its phrases, so the folder (`engine/fold`) and Normalise should keep splices where they are heard.
- **Repeats are written but not heard.** No finder hears verse → verse in Pop or Hypercell: the arrangement does nothing there. That is a cue for the editor, not a language form.
- **Folds the tools could suggest** (I2, for #244; not yet checked note for note):
  - a motif at two scales is one cell at two rates (Korobeiniki, BWV 847);
  - a necklace shared by rhythm and pitch is one table, read as a clock and as a scale (5 to 12).
- **Already decided by it:** the form sends time up ([decision 016](../decisions/016-arranging-at-the-input.md)), and the gate's one `level=` ([decision 023](../decisions/023-gate-spelling.md)). The implicit `&out` was deferred by the owner ("`&out` stays").

## 5. The issues after this pass

| issue | was | now |
|---|---|---|
| #10 | the shakedown, seven questions | the language's map: the invariants, this note, the threads below |
| #337 (new) | — | Strudel and dough: the alignment table, I9, the conflicts and the additions |
| #179 | the operator pass, 5 questions | Q1–Q3 and Q5 answered by decisions 010, 012, 015; left: the shift-with-carry grid (`$` on rotation, accidentals on a reference, a moving amount), the step grammar from #337 |
| #151 | canonical forms, "written by Shorten" | the decision table, its method the four primitives; settled rows dropped; the examples pass's rows added; Normalise (#244) writes it |
| #150 | bands | unchanged; plus where loudness lives (`level=` three ways), dough's units (`lpq`, `distort`) |
| #195 | diagnostics sweep | the remaining silent cases, collected from #250 and #256 (I3, no decision needed) |
| #250 | nits and review leftovers | the language nits only; the UI, MIDI and tools leftovers in its comments moved to #338 |
| #256 → #261 | two issues on arranging | one (#261) |
| #163, #173 | diagnostics leftovers | closed: every item done, moved or accepted |
| #29 | selectors | re-scoped to what decision 016 left: `restart=` as resume, `{lap}`, a restarted part's playhead, kits that pass pitch |

## 6. The owner's answers (round 2)

- **I9 accepted**, with a clean cut: saved pieces don't bind the language until the first release ([decision 027](../decisions/027-on-top-of-strudel.md)).
- **Aligned with Strudel:** `[a b]` (a subsequence; chords take commas), euclid's rotation, `?p` (drops), and `*`/`/` on a clock (faster/slower). Being built on this branch.
- **#306 and `_`:** advice asked for (§7), then taken as written: `glide=`, `&bd:n:gain` and voice `gain=` for #306 (its author applies them there); `_` is Strudel's elongation and `base=` keeps a step with `=` (built on this branch).
- **The multiscale approach is the frame for generalising**, and the cells, operations and wheels are mapped onto it (§8).

Still open, each on its issue:
- where loudness lives (#150; §7 proposes one step)
- what a respelling may change (#151)
- `&>` sends (#149)
- FM feedback (#28)

## 7. A shape for #306's forms and for `base=`'s `_`

Checked against Strudel's `controls.mjs` (`@strudel/core` on unpkg) and dough's reference (`dough-synth` 0.4.0).

- **`legato` → `glide=`.** What #306's flag does (a run of tied notes plays as one, the later notes bends) is dough's **`glide`**, word for word: "creates a pitch slide when changing the frequency of an active voice". So:
  - it becomes `glide=t` on the voice: the slide's time in seconds, `0` or absent off; a note followed by another without a rest is tied;
  - `legato=` stays free for Strudel's meaning, its synonym of `clip`: a note's length × n. That is an addition for later (`legato=.5` staccato), and no conflict.
- **`x%n` → the sound's `:` fields.** Strudel already spells a per-hit level in the mini-notation: a sound takes `name:n:gain` (`s("bd:0:.3")`, `registerControl(['s', 'n', 'gain'])`). In a groove of voices that is:
  - `&bd:0:.3` (a hit at .3);
  - `&bd:2` (a hit two steps up its table: the "pitched hits" #306 leaves as products);
  - `[&bd, &hh:0:.5]` (inside a chord).

  A melody's numbers have no gain field in Strudel (`note`'s second field is `n`). A melody's per-note level stays a level pattern, as Strudel's `.velocity("1 .5")` is: a `map=amp` cell, or a gate's `level=&accent`. `%` stays free for Strudel's polymeter (`{a b c}%4`).
- **A voice's `level=` → `gain=`.** dough's `gain` is "the gain of the sound before it goes into the fx", and superdough's is linear by default (its doc says "exponential", but `gainCurveFunc` is the identity). That is #306's voice level. Naming it `gain=` takes one of `level=`'s three meanings away (#150): `level=` is then a gate's (linear) and the card's (dB). The old `gain=` of decision 023 is gone, and the clean cut lets the name come back with dough's meaning.
- **`oneshot`** has no counterpart to conflict with: Strudel's samples are one-shot by default and `clip` cuts them. It stays.
- **`_` in `base=` → `=`.** Under I9, `_` must elongate the step before it (`0 _ _` is `0@3`). The "as the base" marker needs a sign Strudel doesn't use: **`=`**, read "the same". So `&answer base=&subject^$7 =!3 0@2`, and `=@2` holds the base's pitch for 2. A lone `=` can't be confused with `key=value`. In §8's terms it is a zero detail coefficient.

## 8. The language as a MERA: cells, operations and wheels

[multiscale.md](multiscale.md) holds the theory and the side-by-side table; this section takes it one step further. It maps each form of the language onto a role: an **isometry** (coarse ↔ fine: one block of a level is several of the level below), a **disentangler** (an operation across the edge of a block, before coarse-graining), a **contraction** (a lookup or a junction), and **renormalization** (going inward, from the notes to the cells). Read generatively, from the bulk to the boundary: the cells are the bulk, the sound card the boundary.

### Two towers, not one

Cells has two towers that meet at the junction.

- **The time tower:** samples · notes · steps · bars · sections · the form · the day.
- **The pitch tower:** the root grid (the 12, an EDO) · a key · a scale · a chord · a degree.

`over=` is to pitch what `step=` is to time: each links a cell to the level below it. A pitch is a mixed-radix number (degree + 7 × octave), and so is a time (step + n × bar). The **carry** between digits is the helix, the lap, and both towers have it.

### The forms, by role

| role | time tower | pitch tower | elsewhere |
|---|---|---|---|
| **isometry** (one coarse block → k finer ones) | `step=&x*n` (decision 027: `*` refines); `[a b c]` (inline: one step → 3); `x*n` (a ratchet: k equal children); `x@n` (a child spanning n); a meter's levels (`meter("4/4", 2)`: a binary tree); a splice `&m` in a step; a tap of the bar (a section) | `over=&scale` (Z₇ embedded in Z₁₂, injective: w†w = 1 holds); a chord over a scale (Z₃ in Z₇); `map=edo` (the finest grid) | the junction `*`: a note → thousands of samples ([multiscale.md](multiscale.md#the-junction-projects)) |
| **disentangler** (across a block's edge) | `[<<n]` (a delay carrying into the previous lap); `x@n` across a beat; an anacrusis; `_` (Strudel's, elongation across a step); `glide=` (a tie across steps); swing (soft) | `^n` (a degree carrying into the octave); an accidental (`6#`: a step of the level below); `shift=` and `stride=` (a table turned with carry) | `base=` (§7: a copy and its detail) |
| **contraction** (a lookup, an index from below) | a selector reading `over=&parts` | `over=` read by a melody; a pick `&x[i]`; `map=&table` | a kit read by number; a gate's `play=` |
| **weight sharing** | `x!n`, a cell played many times, `stride=` | a scale read by many cells | the graph is the network folded over time |
| **boundary** (the UV, observed) | the sound card; scopes; the time view | spectrum, waterfall | — |
| **the top** (the IR) | `laps=`, the form's selector, the day (`loop=1d`, `show=sun`) | `&key` (DC), the chromatic stack | — |

**The `$` frame is a layer index.** `^n` moves on the layer the cell reads (its table); `^$n` on the bottom layer (the root grid). `[i]` picks on the layer as turned, `[$i]` as written. So the empty cells of #179's grid are shifts on a named layer of the tower:
- `[<<$n]` is a delay in steps of the bottom clock: seconds, or the meter's own steps;
- a moving amount, `degree(&triad, &prog)`, is a shift whose amount comes from a coarser layer: a disentangler driven from above, as in a MERA whose tensors vary with position.

The only unaddressed layers are the ones between the top and the bottom. They are the one generalisation this reading suggests: a shift on any named layer, not just the nearest or the root. That waits for a piece that needs it.

### The wheels, by role

- **A wheel is a layer's block.** The ring is a cyclic group Zₙ, one turn one block. Its lap counter is the carry into the next layer, so a cell glyph is a digit of the mixed-radix number. Turning it is a translation on its layer.
- **A bulb on a wheel** (decision 021: a cell that is only part of another, drawn on it by the host's coordinate) is the isometry's child drawn inside its parent's block. A splice's bulb sits at its time, a kit's voice at its piece of the kit, a tape's head at its place on the tape.
- **A fixed tap on a turning wheel** (decision 012) is an output leg of a layer: it reads the block, turned.
- **Turntables, belts, tape** are soft time: a warp of a layer's clock, not a re-blocking.
- **The sun** is the top of the time tower (a day); **`&key`'s wheel** the top of the pitch tower.
- **Spectrum, wave, scope** observe the boundary.
- **The tower's axis** is the scale coordinate, the MERA's radial direction. A node's span (from its turn to its step) is the stretch of layers it occupies.
- **The time view's scalogram** is the analysis MERA, built inward from the boundary (a wavelet transform of the notes). The graph is the generative one, built outward from the bulk. Where the two agree (a ridge on a cell's step: 73 of 75 pieces), the code's levels are the heard ones. Where they don't, the code has a level the ear doesn't (repeats written, not heard) or the ear one the code doesn't (Korobeiniki's half phrases). That is the isometry condition, measured from both sides.

### Renormalization: the tools that go inward

- **The folder and Shorten** coarse-grain a program: they find repeated blocks (weight sharing) and factor them into cells (β-expansion in [multiscale.md](multiscale.md)'s terms).
- **`base=` is lifting.** Lifting factors a wavelet transform into *predict* and *update*. The base is the prediction, the delta is the detail coefficients, and `=` is a zero coefficient. A fugue's bent entries are a subject plus small details, which is why the folder found `base=` useful.
- **Normalise is the flow to a fixed point.** A canonical form is a program that coarse-graining no longer changes (Shorten's idempotence, #142).
- **Relevant and irrelevant.** What survives coarse-graining is a piece's relevant structure: the key, the form, the tempo map, the bar. What vanishes is the ornament: ratchets, chance, an accidental. This is a measure the scalogram can give per piece (ridge strength by level), and a guide for the folder: keep a level as a named cell when it is relevant, inline it (`[a b]`, `x*n`) when it isn't.

### What this generalises in the language

These follow from the mapping and need no new primitive. The owner's approval is for the direction; each lands as its own item.

1. **One isometry, written at any scale.** `[a b c]`, `x*n`, `x@n`, `step=&x*n` and a splice are one operation (refine a block), inline or named. The folder and Normalise may move between them: a level used once inline, a level shared named (#151's canonical rule for the *dilate* families).
2. **One disentangler: a shift with carry on a layer.** Time and pitch alike, the layer the cell's own, or `$` the root. It fills #179's grid without new signs.
3. **Lookups are contractions with an index from below.** `over=`, picks, kits, a gate's `play=`, a selector: one primitive (#151's *look up* row), so the gate's `play=` and `over=` are one form, two spellings.
4. **The detail is first-class.** `base=` with `=` is the language's lifting step; the folder writes it, and the scalogram can say where a detail is heard.
5. **A check across both sides:** per piece, the code's levels (`towerSpans`) against the heard ones (the scalogram's ridges and swells). This is the isometry condition as a report in the time view, not a warning. It is lead 3 of [multiscale.md](multiscale.md), now with both halves built.
