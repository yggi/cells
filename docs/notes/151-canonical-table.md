# #151's canonical table, drafted by the four primitives

Date: 2026-10-13 · Status: open (a draft for the owner, row by row) · Issue: [#151](https://github.com/yggi/cell-studio/issues/151) (#10, #141 phase 3)

**The question.** Which spellings of the language mean the same thing, and which one should Normalise write (decision
[017](../decisions/017-shorten-and-normalise.md))? **The method** ([multiscale.md](multiscale.md#disentanglers-towards-a-minimal-grammar-10-179),
[10-language-pass.md](10-language-pass.md) §3 and §8): write every row of [reference.md](../language/reference.md) as one
of four primitives (**look up**, **dilate**, **shift with carry**, **combine**), or soft time, or a parameter of a voice, or
nothing (display). Rows that land on one primitive with one meaning are a **family**. **The numbers** are over the
library (77 pieces in `examples/`), by the probe `tools/probe/canonical.test.ts`:

```
PROBE=out.txt npx vitest run tools/probe/canonical.test.ts && cat out.txt
```

Spelling is read from the text (the parser forgets `_`, `!2`, units); meaning from the parser's cells (which cells are
voices, what a braid holds). The counts are "uses × in pieces".

## Headline

- **30 families.** **11 are settled** by a decision or an issue (restated in [Settled](#settled-restated-not-reopened)); **19
  are open**, one row each in [Open families](#open-families-the-owner-decides-row-by-row): 17 for the owner now, 2
  (loudness, the gate against a product) waiting on #150 and the gate note.
- In 10 of the 19 the library already writes one spelling almost everywhere, so the decision is cheap (at most 6 places
  change): units, a table turned, swing, a rhythm, hold, ratchet, chance, a changed copy, chords' spacing, the trivial ones.
- The ones that move many pieces: **the bar** (53 pieces write `scan(1 1 1 1)`), **a mode** (25 scans of a named scale
  in 24 pieces against 26 `scale(…)`), **a drum hit** (39 zero patterns in 20 pieces against 20 grooves in 16),
  **repeats** (65 runs of two written out: 39 of notes in 24 pieces, 26 of rests in 12), and the **β row** (116 cells spliced once, 317 unnamed cells).
- **What doesn't fit the four:** soft time (swing=, wow=, varispeed=, belts, a tape), `inverse()` (a reflection),
  `map=lin`'s ramp (an interpolation), `free()` (a value from outside), `[a|b]` and `x?` (dice), `law=`. See
  [Method notes](#method-notes).

## Every row of reference.md, by primitive

**L** look up · **D** dilate · **S** shift with carry · **C** combine · **T** soft time · **P** a parameter of a voice
(or a physical cell) · **N** none (display, structure). **F*n*** is the family's row below; **Fs*n*** a settled one.

### Lines, steps, modifiers

| row | primitive | family |
|---|---|---|
| `&name …` a cell | N (a binding: β) | F15 |
| `&name label="…"` a note | N | |
| `off` | C (a product by 0) | |
| `oneshot` | P | |
| `# …` · `// …` | N | F17 |
| continuation `+ * , [` | N | |
| `&parts step=&bar &a &b` (taps) | L (the table a selector reads) | |
| `n` | L (an index into `over=`), or a value | |
| `n#` `nb` `ns` `nf` | S (a step of the grid below) | Fs1 |
| `n/d` | a value (a grid's ratio) | |
| `~` | C (the empty step: 0) | |
| `_` | D (elongation) | F10 |
| `=` (with base=) | L (the base's step) | F14 |
| `[a, b, c]` chord | C (a stack) | Fs2, F16 |
| `[a b c]` · `[a b, c]` | D (one step refined into k); with commas C | F11, F15 |
| `[a\|b\|c]` | L by dice (open: see method notes) | F13 |
| `&x` spliced | D (a block placed in a step) | F15 |
| `&voice` stepped (groove) | L (a step picks a voice) · C | F8 |
| `x!n` | D (weight sharing) | F11 |
| `x*n` | D | F12 |
| `x@n` | D | F10 |
| `x?` · `x?p` | C (a random 0/1 mask) | F13 |
| `&x:0:gain` | C (a gain) | Fs9 |

### References, generators, free()

| row | primitive | family |
|---|---|---|
| `&name` | the context's (splice D, after an attribute L, in a mix C) | |
| `&name[i]` · `[$i]` | L | |
| `&name[a:b:s]` | L (`[::-1]` too: an index read backwards) | |
| `&name[<<n]` · `[>>n]` | S (time) | Fs3, F5 |
| `&name^n` · `degree(&name, n)` | S (degrees) | Fs10 |
| `&name^$n` | S on the root grid (≡ C `+n`) | F14 |
| `inverse(&name)` | **none** (a reflection) | |
| `&( … )` | N (β: unnamed) | F15 |
| `scan(i …)` | D (a meter: a block cut unequally) or the table L reads (a scale) | F3, F4, F6, F7 |
| `euclid(k, n, r)` | D (k hits in n) | F7 |
| `sin(n)` | the table L reads | |
| `scale(name, tonic)` · `scale("t:name")` | the table L reads · S (tonic, modes) | F4, Fs7 |
| `fifths()` | the table L reads (a walk by 7, carried mod 12) | |
| `meter("sig", sub)` | D (a bar into levels) | F3 |
| `spell("text", &t, "names")` | L | |
| `free(v, lo..hi)` · `free(marking)` · `free(0 2 ~)` · `free("text")` | **none** (a value from outside) | |

### step=, loop=, map=

| row | primitive | family |
|---|---|---|
| `step=r` · `loop=r` | D | F2 |
| `loop=NAME` (A4, SAMPLE_RATE) | D | F1 |
| `step=&x` · `loop=&x` | D | F2 |
| `step=cycle(&x)` | D | F2 |
| `step=&x*n/d` | D | Fs4 |
| `nbpm` `nhz` `nmin` `nh` `nd` `nwk` `nk` | D (a unit) | F1 |
| `map=amp` · `map=db` | C (a volume; db a unit) | F18 |
| `map=lin` | C, its ramp **none** (an interpolation) | |
| `map=adsr` | C (a volume per note) | F9 |
| `map=sample` · `map=midi` · `midi(c, p)` | C (the card's sum) · N (output) | Fs8 |
| `map=edo` · `map=ed(r)` · `map=ratios` | L (a grid: index to frequency) | Fs6 |
| `map=&table` | L | |

### Attributes

| row | primitive | family |
|---|---|---|
| `over=&t` · `over=&t[<<n]` · `over=scale(…)` | L (· S) | F5, F15 |
| `base=&x` · `^$n` · `^n` | C (an overlay: lifting) · S | F14 |
| `shift=n` | S | F5 |
| `stride=n` | S per step | |
| `cycle=n` | S (where the carry happens) | Fs5 |
| `laps=n` | D (the top: a count) | |
| `chance=p` · `seed=n` | C (the mask's p) · P | F13 |
| `env=&e` · `pitch=&v` | C on the voice | F9 |
| `show=` `label=` `size=` `title=` `tags=` `about=` `tier=` | N | |

### Parameters, sorts, mixes, gates

| row | primitive | family |
|---|---|---|
| `s=` (`tri`/`triangle`, `saw`/`sawtooth`) | P | F17 |
| `lpf` `lpq` `hpf` `hpq` `room` `delay` `delayfeedback` `glide` `distort` `crush` `ratio` `index` `body` `ring` `hard` `board` `couple` `coupling` `excite` `erase` `tone` `drive` `hiss` `print` `printgap` `dropout` `scope` `fold` `bins` `channels` | P | |
| `delaytime=&clock/n` · `length=&clock/n` · `at=&clock/n` | P, its clock D | Fs4 |
| `fm=&op` | P (≡ C: an operator in a sum, decision 030) | Fs11 |
| `pan=` | P (≡ C: two chords on the card) | Fs8 |
| `postgain=` · `gain=` · `level=` | C (a gain) | Fs9, F18 |
| `beat=n` | D (which level is the beat) | F3 |
| `swing=` | **T** | F6 |
| `motor` `mass` `friction` `wind` `wow` `varispeed` `belt` `damping` `slip` `wander` `wanderhz` | **T** | |
| `write=` · `play=` (a read head) | L (a tape read by position) · `at=` S, continuous | Fs3 |
| `anchor=` | S (a day clock's phase) | |
| `restart=` | N (a selector's policy) | |
| `law=` | **none** (a rule from outside) | |
| sorts (`signal` `wave` `volume` `plain` `pitch`) | N (types: they say what C does) | |
| `[a, b]` a mix · `p * s` · `a + b` · `n` · `( … )` | C | F9, F14, F18, F19 |
| `play=&x` · `level=` · `[&a, &b]` (a gate) | C (a product with a name; a kit of bare voices L) | F8, F19, Fs9 |

## Settled (restated, not reopened)

| | family | primitive | canonical | by |
|---|---|---|---|---|
| Fs1 | accidentals: `6#` `3b` ≡ `6s` `3f` | S | `#`, `b` (library: 11 in 4 pieces, all `#`/`b`) | [033](../decisions/033-degrees.md) |
| Fs2 | chords: a comma makes a chord; `[0 2 4]` is a subsequence | C | `[0,2,4]` | [027](../decisions/027-on-top-of-strudel.md), #343 |
| Fs3 | a delay: `[<<n]` (a copy) against `play= at=` (what was recorded) | S | two meanings, both kept | [010](../decisions/010-canon-copies.md) |
| Fs4 | a rate on a clock: `*n/d` ≡ `/d*n` | D | `step=&x*n/d`, `*` faster (library: 17 chains, all `*n/d`) | #171, [027](../decisions/027-on-top-of-strudel.md) |
| Fs5 | a turning table's `cycle=` | S | left out when it is the length | [008](../decisions/008-tables-come-round.md) |
| Fs6 | a grid: `map=edo` ≡ `map=ed(2)` | L | both kept | [003](../decisions/003-cycle-one-job.md) |
| Fs7 | mode numbering, Strudel's `scale("D:minor")` | L | `scale(name, tonic)`; `scale(t, p)` warns | [013](../decisions/013-scale-generator.md), [033](../decisions/033-degrees.md) |
| Fs8 | stereo: `pan=` ≡ two chords on the card; MIDI channels | C | `pan=` where two chords are equal (33 in 13 pieces; 12 two-chord cards) | [007](../decisions/007-pan-is-back.md), [019](../decisions/019-midi-card.md) |
| Fs9 | a gate's intensity; a hit's own gain `&x:0:g`; a voice's `gain=` | C | `level=` one product; `:0:g`; `gain=` | [023](../decisions/023-gate-spelling.md), [027](../decisions/027-on-top-of-strudel.md) (#306) |
| Fs10 | degrees: `&x^n` ≡ `degree(&x, n)` | S | `^n` the short form, `degree()` for nesting; the operator pass may respell (`&x~1`) | [015](../decisions/015-caret-is-degrees.md), #171, **#179** |
| Fs11 | FM: `fm=&op` ≡ an operator in a sum | P/C | both, built with the feedback work | [030](../decisions/030-fm-feedback.md) |

Also settled, not families but rows that let a respelling keep its sound: chance keyed without the voice
([031](../decisions/031-chance-keyed-on-time.md)), a kit passes pitch and varispeed ([029](../decisions/029-kits-pass-pitch.md)), section
mixes folded into the card ([016](../decisions/016-arranging-at-the-input.md), #306).

## Open families (the owner decides, row by row)

Why-keys: **short** (fewer characters, never longer) · **Strudel** (decision 027: its spelling, its meaning) · **I6**
(the named form defines the meaning) · **lib** (what the library already writes).

| | family | primitive | spellings today (uses × pieces) | proposal | why |
|---|---|---|---|---|---|
| F1 | **units of a rate** | D | pitch: `loop=A4` 205×73, `loop=440` 35×21, `440hz` 2×2; tempo: `84bpm` 62×56, plain `step=2` 13×7 and `loop=.37` 9×5, `free(andante)` 14×13, `2hz` below hearing 0; `44.1k`, `1min` `1h` `1d` `1wk` 6×3 | a note name for a pitch on the 12 (A4 = 440), plain Hz otherwise (partials, microtonal, waves); `bpm` on a meter, a plain number on a cell with no meter; `hz` never; otherwise the unit that makes the number round | I6, lib, short |
| F2 | **`step=` against `loop=`** below hearing (`loop=r` ≡ `step=r·k`); `cycle(&x)` ≡ `&x/k` while x's length is fixed | D | `step=` 348×75; `loop=` 31 (a clock 17×13, a rate 14×7: LFOs, sweeps, wall-clock dials); `step=cycle(&x)` 9×5 | `loop=` where the turn is the unit (an LFO, a sweep, a dial), `step=` where the steps are events; `cycle(&x)` where "once per turn" is the meaning | I6 |
| F3 | **the bar** | D | `scan(1 1 1 1)` 53×53, `scan(1 1 1)` 2, `scan(1 1 1 1 1)` 1, `scan(1!n)` 5×2 (day dials), `meter(…)` 1×1 (free), `beat=` 2×2; bent `scan(27 23 26 24)` 6×6, `scan(28 37 35)` 2×2 | `meter("4/4")` (12 characters against 14); a bent bar only where the feel is the point (#151, item 3); `beat=` folds into `meter(sig, sub)` | I6, short, Strudel-neutral |
| F4 | **a mode** | L | scans of a named scale 25×24 (major 9, minor 9, minorpentatonic 2, lydian 2, blues, dorian, major + `shift=1`); `scale(name)` 13×11, `scale(name, tonic)` 13×9 | `scale(name)` / `scale(name, tonic)`; `scan()` only for a set with no name (none in the library) | I6, Strudel, 033 (the folder writes it) |
| F5 | **a table turned** | S | `shift=n` 3×2 (transpose, coltrane); `over=&t[<<n]` 0; a mode by name (F4) | a mode's name where one exists (`scale(dorian)`, not `scan(…) shift=1`); `shift=` where it moves (a slider, a key walk); `[<<n]` for one reader's view | I6 |
| F6 | **swing** | T against D | a swing clock `scan(2 1)` 1, `scan(free(2, 1..3) 1)` 3 (jazz, five, coltrane); `swing=` 2×2 (swing, metronome) | the clock `scan(2 1)`; retire `swing=` (it does nothing on a `scan`, F5 of #10) or keep it as shorthand for the clock | lib, fits D; ⚖ #10 F5 |
| F7 | **a rhythm** | D | `euclid()` 2×2; written lists equal to an uneven euclid 3×3 (swing `euclid(6, 8, 2)`, automaton `euclid(5, 8, 6)`, cellscape `euclid(5, 8)`), to an even one 3×2; as intervals `scan(3 3 2)`, `scan(3 3 4 3 3)` (rhythm, bossa) | `euclid(k, n, r)` for an uneven Euclidean pattern; a written list for an even one (`0 ~ 0 ~`: shorter); a scan of intervals stays (it is a clock, not hits) | I6, Strudel |
| F8 | **a drum hit** | L · C | a pitch pattern of zeros times a voice 39×20; a groove of voices 20×16; a pattern through a kit 2×2; a volume pattern of ones 1×1 | the groove: `&beat step=&bar*4 &bd ~ &sd ~` | I6 (the drum by name), Strudel (`s("bd ~ sd ~")`), 029 and 031 keep its sound |
| F9 | **a voice's own volume and pitch** against factors in a product | C | `env=` 242×66, an envelope factor `* &env` 0; `pitch=&x` 21×17, `pitch=lo..hi * &shape` 25×19, a moving pitch in the product's sum 3×3 (baustelle, brothers, testtones) | on the voice when it belongs to every note the voice plays; in the product when it belongs to one line (baustelle's slide) | lib, I6 |
| F10 | **hold**: `x@2` ≡ `x _` | D | `x@2` 521×38, `x@n` 153×22, `_` 2×1 (rests, the tutorial) | `x@n`; `_` read, as Strudel's | short (equal at 2, shorter from 3), lib |
| F11 | **repeat**: `x!n` ≡ `x x` | D | `x!n` (n ≥ 3) 87×27, `x!2` 49×23; written twos: notes 39×24, rests 26×12; written 3+: 8×6 | `x!n` for every run of two or more | short (never longer; shorter for any step wider than one character), one rule |
| F12 | **ratchet**: `x*n` ≡ `[x x]` | D | `x*n` 11×4, `[x x]` 0 | `x*n` | short, lib |
| F13 | **chance**: `x?` with `chance=p` ≡ `x?p` on every step | C | bare `x?` 31×8, `x?p` 23×7, `chance=` 2×2; `[a\|b]` 13×5 (no `[x\|~]`) | `chance=p` with bare `?` when three or more steps share p; else `x?p` | short |
| F14 | **a changed copy / a transposition** | C · S | `base=&x … =` 2×1 (variations); `&x^$n` 19×6; `+ n` in a mix's sum 3×2 | `base=` when the copy keeps most steps (shorter than a new cell), else a cell of its own; `^$n` in a braid, `+n` in a mix (a law, not a respelling: they sit in different places) | short, 026 |
| F15 | **inline or named (β)** | N/D | `&( … )` 317×66 (mostly envelopes); cells spliced once 116×23, twice or more 33×19; `over=scale(…)` inline 14×8, a named `&key scale(…)` 12×12 | one rule: inline when used once, named when shared (§8 item 1, weight sharing), except a cell a note explains, a `show=` names, or a selector reads. Normalise applies it to tables only; phrases stay the author's (017) | 017, §8 |
| F16 | **chords' spacing**: `[0,2,4]` ≡ `[0, 2, 4]` | C | tight 249×32, spaced 0 (reference.md shows both) | tight | lib, short |
| F17 | **trivial spellings** | N/P | comments `#` 355×63, `//` 0; `s=tri` 41×38, `s=saw` 44×31, `triangle` and `sawtooth` 0; the card `&out` 57×57, `&mix` 19×19 | `#`; `tri`, `saw`; the card's name with #150 | lib; #150 |

| F18 | **loudness** | C | `map=amp` 16×10, `map=db` 2×2; a gain number in a product; `gain=` 28×13; `&x:0:g` 83×10; `level=` 2×1; `postgain=` 75×75 | waits on #150's bands (as #151 says); `map=amp` over `map=db` unless the numbers are decibels by nature | ⚖ #150 |
| F19 | **a gate against a product** | C | products with a voice in a mix 230×73; a gate (`play=` with a braid) 2×1 (*gate*) | the product (shorter, Strudel's `n(…).s(…)`); a gate where its levels are named or it plays several voices | short, lib; ⚖ [gate-example.md](gate-example.md), 006 and 023 settle meaning and the gate's own spelling |

### Caveats a decision should know

- **F3:** `meter("4/4")` and `scan(1 1 1 1)` step alike, but their values differ (levels 0 1 1 1 against 0 1 2 3). The
  probe didn't check whether anything reads a bar's values; a rewrite must.
- **F4:** `scale(name)` is a generator over a key of its own (decision 013): the graph gains a key node where a `scan` had
  none. The notes are the same.
- **F8:** moving a pattern onto a groove changes nothing heard since decisions 029 and 031 are built; until then it rolls new
  dice in the 9 pieces with `?` or `[a|b]`.
- **F11:** the 8 written runs of three or more (metronome, korobeiniki, pachelbel, bwv847, drums, dtmf) may be written so
  for the bar's sake; Shorten has not taken them, which is worth a look.
- **F15:** inlining the 116 single splices would remove named phrases (Korobeiniki's A and B). The proposal keeps them.

## Method notes

- **Where the four fit.** Every row of the language's grammar landed on one primitive, or on a value, a display or a
  parameter. Families came out of the rows that landed twice with one meaning; the D rows gave most of them (8 of 19
  open), as §3 of the language pass guessed.
- **A family can span two primitives.** `^$n` (S on the root grid) and `+n` in a mix (C) mean the same: on the bottom layer
  a shift with carry is plain addition, because the 12's carry into the octave is the integers' own. Likewise `pan=` (P)
  and two chords (C), `fm=` (P) and an operator in a sum (C), `swing=` (T) and a swing clock (D). The primitives are a lens,
  not a partition.
- **What fits none of the four (the open cases):**
  - **soft time:** `swing=`, `wow=`, `varispeed=`, the belts, a tape's `at=` and `wander=`, the motor's physics. F6 is the
    only one with a D spelling beside it (the swing clock), and it is the one the library prefers. A fifth primitive (a
    warp) or a shift by a cell's values, as multiscale.md asks, is still undecided; nothing here needs it.
  - **`inverse()`**: a reflection (v → −v), neither a shift nor a lookup. With `[::-1]` (retrograde, which is a lookup)
    it makes the canon's four transforms; inversion may want a primitive of its own, or a lookup through a mirrored table.
  - **`map=lin`'s ramp**: an interpolation between values, a soft value as swing is soft time.
  - **`free()`** and **`law=`**: values and rules from outside the piece, boundary conditions rather than operations.
  - **dice** (`x?`, `[a|b]`): a lookup indexed by chance (decision 031 keys it on time), or C with a random mask; it fits
    either, which is why it is listed.
- **What the probe can't see.** It counts spellings, not readers: F3's values, F2's turns and F14's copies want a check
  that the rewrite plays the same notes, which Normalise must make anyway (#244: the event snapshot). Counts depend on
  regular expressions over the text; a miscount of a few is possible in F11 and F15.
- **Next.** The owner decides each open row; a decided row lands as one PR (#151's "What follows a decided row"). The probe
  stays in `tools/probe/` to re-measure after each.
