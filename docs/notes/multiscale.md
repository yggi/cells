# The piece as a tower of scales (MERA, wavelets, GTTM)

Date: 2026-10-09 · Status: open (conceptual; probes only) · Issue: [#234](https://github.com/yggi/cell-studio/issues/234) (the multiscale epic) · Grew out of the outputs-at-12-o'clock probe ([#236](https://github.com/yggi/cell-studio/pull/236), `docs/notes/outputs-top.md` there)

The owner's question: **are we building a MERA?** One dimension (time) under several scales (pitch, meter, rhythm, sections); the sound card as the state it describes; a tree of scale-invariant operations, disentanglers and isometries, reaching it from a border of simple sources (`&bar`, `&key`, `free()`). This note collects the analogy, where it holds and where it breaks, the theory behind it with references, what was measured in the code, and the practical leads for Cell studio. It is exploratory: a claim here is a hypothesis unless it says *measured*.

## The short answer

Structurally, yes, but in its **classical** form and **turned inside out**:

- Cell studio is a weight-shared, multiscale, generative network over musical time. The classical counterpart of MERA is the wavelet transform (Evenbly & White 2016); its music-theory counterpart is GTTM's reduction trees (Lerdahl & Jackendoff 1983).
- The **sound card is the boundary**, not the centre. In MERA the physical, finest-grained state sits on the boundary (the UV) and the bulk's deep layers are the coarse, long-range structure (the IR). Here the finest scale is the sample stream; `&key` (one value for the whole piece) and the form are deep in the bulk. The owner, refined: *we sit inside `&out`*: the card is the outside, and the graph is the bulk seen from it.
- There is no entanglement, only correlation; no unitarity is required. What carries over is the *shape*: layers by scale, coarse-graining by isometries, short-range correlations across block boundaries by disentanglers, and a bounded causal cone.

## The picture: a frequency tower

The owner's shape, from the bottom up, along a logarithmic frequency axis at the side of the graph:

| zone | frequency | what sits there |
|---|---|---|
| 0 Hz (DC) | constant | undriven tables: the chromatic stack (pitch classes 0–11 in their colours), `&key`, `&mode` |
| sub-Hz | hours … seconds | the slow: the sun, a day (`loop=1d`), the form, selectors, sections |
| ~1 Hz | the beat, the bar | `&bar`, the meter's net |
| 1–20 Hz | rhythm, figuration | melodies' steps, a vibrato, a fast arpeggio |
| 20 Hz – 20 kHz | audible | voices at their pitch, bass to soprano, rainbow bands on the tower |
| outside | — | the sound card: not a node; audio sources wire to the tower at the height they sound now, their tap moving as they play |

Everything with a `step=` or a `loop=` sits at its level, with a horizontal line to its anchor on the tower; a node with a time value (Hz, seconds, hours) shows it there.

**Precedent.** This is Stockhausen's unified time continuum (*… wie die Zeit vergeht …*, written 1955, published in *die Reihe* 3, 1957): the fastest impulses are heard as pitch, countable ones as rhythm, the slowest (up to a quarter of an hour) outline the form, one axis of "phase durations" (Phasendauer) [Stockhausen 1957]. Cowell had the ratios of rhythm and pitch as one system earlier [Cowell 1930]. The critique belongs with it: Ligeti called the unification dogmatic, and the acoustics of the essay were contested (Backus 1962). Perception is not one log axis: pulse is felt from about 100 ms to 2 s, the ear fuses pulses into pitch near 20 Hz, and form is remembered, not heard as a period [London 2012]. The owner's zones respect those thresholds; the tower should mark them rather than pretend the axis is uniform.

### Measured: where the library's cells would sit

`tools/probe/tower.test.ts` (`PROBE=out.txt npx vitest run tools/probe/tower.test.ts`) places every cell of the 68 examples by its time constant: a clocked cell by its steps per second and by its **turn** (steps per second ÷ steps), a voice by its pitch.

| role | cells | median turn | median step |
|---|---|---|---|
| undriven table | 309 | — (DC) | — |
| clocked (melodies, levels …) | 292 | 1/4.8 s | 1.9 Hz |
| meter | 74 | 1/2.4 s | 1.7 Hz |
| voice | 258 | 262 Hz | — |
| **selector** | **10** | **1/96 s** | **1/12 s** |

- Turns span eleven decades: from a week (`loop=1wk`, 1/6·10⁵ s) to an audio-rate wave (2 kHz). 21 of 292 clocked cells take a minute or longer to come round.
- **A node is a span on the tower, not a point**: its step and its turn are two time constants, often two decades apart (a selector: a section every 12 s, round in 96 s). Drawn as a vertical bar from its turn to its step, nesting becomes visible: a cell spliced into another, or stepped by it, should have its turn near its parent's step. That is the isometry condition, and it can be measured (lead 3).

## MERA in brief

A MERA [Vidal 2007, 2008] describes a state of a 1D chain by a network in layers, one per scale. Each layer has **disentanglers** (unitaries on neighbouring sites across the boundary of two blocks: they remove short-range correlation) and **isometries** (two or three sites to one: coarse-graining, w†w = 1). Going up, the chain halves each layer, so a piece of length N needs log N layers. Two properties make it useful:

- **The causal cone is bounded**: a local observable at the boundary depends on a fixed number of tensors per layer, so it can be evaluated in O(log N).
- **Scale invariance**: the same tensors in every layer give power-law correlations: the critical states that a plain tree (a tree tensor network, no disentanglers) can't describe.

Seen as geometry, the network is a discretised hyperbolic plane whose boundary is the physical chain; minimal cuts through it measure entanglement (Swingle 2012), the start of the "holographic" reading.

### Its classical shadow: wavelets

Evenbly & White showed that discrete wavelet transforms are MERAs for free particles: Daubechies wavelets, written as circuits of local 2×2 rotations, give the ground state of the critical Ising chain [Evenbly & White 2016], and every compact orthogonal dyadic wavelet has such a circuit (Daubechies, coiflets, symlets; new ones designed the same way) [Evenbly & White 2018]. On the signal-processing side, the **lifting scheme** factors every wavelet transform into a short sequence of two primitive steps on neighbours, *predict* and *update* [Daubechies & Sweldens 1998]. That is the closest thing in the literature to the owner's wish for a "constructive solid geometry" of operations: a small set of steps from which every transform in the family is built.

## GTTM

Lerdahl & Jackendoff's *Generative Theory of Tonal Music* [1983] describes a heard piece by four structures: **grouping** (nested segments), **metrical** structure (nested levels of beats), **time-span reduction** (a tree in which each segment is represented by its most important event, recursively) and **prolongational reduction** (a second tree, of tension and relaxation, whose spans cross the time-span boundaries). Well-formedness rules say what a structure can be; preference rules say which one a listener hears.

- It has been implemented: Hamanaka, Hirata and Tojo's ATTA derives time-span trees from a score, with a database of 300 analysed pieces [Hamanaka et al. 2016]; Nakamura et al. read the time-span tree as the parse tree of a probabilistic grammar.
- **Against MERA:** the metrical structure is the isometries (beats → bars, strictly nested); the time-span reduction is a tree tensor network, coarse-graining by choosing a representative; the prolongational reduction, crossing the time-span boundaries, plays the part of the disentanglers. GTTM's grouping also allows overlap and elision at a boundary, as an exception to strict nesting. That is the place where a strict tree fails, as in MERA.
- **Against Cell studio:** GTTM *analyses*: it goes from the notes (the boundary) inwards, as renormalization does. Cell studio *generates*: from the cells outwards to the samples. **Shorten** is the one part of the app that goes inwards: it factors the notes into cells, and so builds a reduction (lead 6).

## Side by side

| | MERA | wavelets | GTTM | Cell studio |
|---|---|---|---|---|
| the boundary | the physical chain (UV) | the samples | the score's notes | the sound card (the outside) |
| the deep bulk | the coarse state (IR) | the lowest band | the piece's head event | undriven tables, the form, `&key` |
| direction | either: a state ↔ its renormalization | analysis ↔ synthesis | analysis | synthesis; Shorten the other way |
| isometry | 2→1, w†w = 1 | down-sampling after a filter | metrical levels, the head of a span | rates (`step=&bar/4`, `*n`), a meter's steps, a note into samples (the junction) |
| disentangler | unitary on two neighbours across a block's edge | lifting's predict/update | prolongation, grouping overlap | a shift across the edge of a block: `[<<n]`, `^n` across an octave, `@` across a beat, swing, an anacrusis (lead 4) |
| weight sharing | per layer; per scale when invariant | one filter at every scale | — | a cell played many times, `!n`, a table read by many: the graph is the network folded over time |
| quantum | yes | no | no | no |
| exact? | variational | exact, invertible | preferences, ambiguous | exact: the code is the piece |

## The inversion: selectors (measured) and BWV 847

The owner's stress point: *by their time constant, arrangement selectors sit at the bottom, not above the instruments; is the arrangement method upside down? Is that why BWV 847 needs awkward `&tacet`s?*

**Measured:** the 10 selectors in the library are the slowest clocked cells there are (sections every 8–27 s, round in 34–320 s), and every one of them is *after* all the voices it picks: their sound passes through it (`&out … &song`). On the tower they are at the bottom; in the signal flow at the top.

**What is upside down, and what isn't.** A gate that switches sound is legitimately downstream of the sound: a VCA in a modular synth. What is inverted is two other things the selector carries:

1. **The audio passes through it.** In a modular rack the sequencer at the bottom sends *gates* up to the VCAs; the audio goes straight to the output and never through the sequencer. Today a selector is a mixer with switches.
2. **The time origin.** "A part picked starts from its top" (`docs/language/time.md`): the selector gives each part its local clock, a coarse level handing its children their coordinates, which is exactly an isometry's job. But it does that from downstream, so it can only restart a whole part, on its own fixed grid of sections.

**BWV 847.** It has no selector: each of its five voices carries the whole piece's timeline and waits out the other movement with a rest, `&tacetFugue ~@511` and `&tacetPrelude ~@624` (`examples/bwv847.cells`). A selector could not do it today: its sections are a fixed number of steps of its own clock, while the movements are 624 and 511 sixteenths under one tempo map (`&tempo scan(1!432 .72!96 …)`), not a whole number of any common section. The `&tacet`s are the form written into the leaves because the form has no level of its own.

**Proposal to test** (not a decision): the form as the deep level that sends *up*:

```
&form step=&tempo 0@624 1@511          # the movements, in the tempo map's own steps
&prelude …   &fugue …                   # each a part, starting at its own top
```

where `&form` sends each part a gate and its local time (a bus of section gates, one wire per part, into each part's junction, lead 5), and the sound goes straight out. The `&tacet`s disappear, the movements become parts of their own, and the selector sits where its time constant puts it. Open: whether this is a new reading of `over=&parts` (the selector's output read as gates) or a new port; it touches #29 (`restart=`, "one rule, two triggers") and could change saved pieces, so ⚖ owner.

**A pushback on the picture.** The tempo map `&tempo` is the piece's slowest *structure* carried on a fast *clock* (a sixteenth a step): one cell, two time constants five decades apart. So "by its time constant" needs care: a node's place on the tower is a span, and what is upside down is a coarse span placed downstream of fine ones.

## Disentanglers: towards a minimal grammar (#10, #179)

Cell studio's operations that cross a block's edge, sorted by what they do:

| family | operations | what it is |
|---|---|---|
| **shift with carry** on a helix | `[<<n]` (a delay in steps), `shift=` (a table turned), `^n` (degrees, carrying into the octave), `^$n`, `@` and rests across a beat, an anacrusis, `stride=` | a cyclic shift on one level whose overflow carries into the next: the helix is a mixed-radix number (degree + octave × 7; step + bar × n) |
| **dilation** | `step=&bar*4`, `/n`, `cycle(&x)`, `loop=`, `laps=` | a change of scale: the isometry |
| **lookup** (composition) | `over=`, `map=`, a pick `&x[i]`, a selector | a function through a table: composition of maps, a projection when it picks |
| **combination** | `+` `*` in a mix (decision 006), a chord, a mix's entries | a sum or a product: contraction at a junction |
| **soft time** | swing, a belt's wow, a tape's `at=`, varispeed | a smooth warp of time: a continuous shift |

**Hypothesis:** the disentangler of musical time is **a shift with carry across the edge of a block**, the one operation that relates neighbours in different coarse blocks (an upbeat into the bar, a suspension over the bar line, a canon's entry a bar late, a melody stepping across the octave). Lifting's predict and update are shifts of neighbours combined, too. If that holds, four primitives may generate the table: **shift-with-carry, dilate, look up, combine**, as union, intersection and difference generate a CSG solid. Testable: express each row of `docs/language/reference.md` in the four and list what doesn't fit; Shorten's canonical forms (#151) would then be normal forms in that grammar. Soft time is the doubtful row: it may be a fifth primitive (a warp), or a shift by a cell's values.

## The junction projects

The owner's word for the junction is **project**: `&theme * &flute * .4` projects a melody's pitch over a scalar onto a voice. In the tower's terms the junction is the **isometry from the note level to the sample level**: one event (a time, a pitch, a level) becomes thousands of samples, shaped by the voice. A note times a voice is an *atom* in a time-frequency dictionary (a time, a scale, a frequency, as a Gabor or wavelet atom), and the sound card is their sum: synthesis is an inverse transform. As a tensor: a junction contracts the indices (time from a clock, pitch from a table, timbre from a voice, level) into one output index.

So a junction with a body, an explicit **play node** (inputs below: trigger and pitch from a melody, levels; its voice beside it; its output socket on top), is the node every level needs, not only the note level: a selector's gate into a part is the same shape one level down (lead 5). Making `*` explicit in the language is not this note's job; keeping the junction a node (the fold optional, the outputs probe's next step, [#236](https://github.com/yggi/cell-studio/pull/236)) keeps that step open.

## Category theory

What helped before (the nets model) was looking at the graph as composable arrows. The relevant pieces:

- **Transformational theory** [Lewin 1987]: a network is a graph of musical objects whose arrows are labelled by transformations, and consistent when the paths between two nodes compose to the same transformation. Our edges' labels are transforms (`edgeLabel`, `engine/transform.ts`), so a cell graph *is* a transformational network. **Lead:** a check that two paths between the same cells compose to the same transform (a commutative diagram), or a warning that they don't. Klumpenhouwer networks made categorical, as functors from a small category into Sets and then Rel, are PK-nets [Popoff, Andreatta, Ehresmann 2015–2018].
- **Monoidal categories and string diagrams**: tensor networks are string diagrams [Biamonte, Clark, Jaksch 2011; Coecke & Kissinger 2017]; a junction with several inputs is a morphism of a symmetric monoidal category, and a wiring of boxes is an algebra of the **operad of wiring diagrams** [Spivak 2013; Fong & Spivak 2019]. The minimal grammar question is then: which generators and relations present the category (the CSG question in that language).
- **Temporal media**: Hudak's algebra of sequential and parallel composition [Hudak 2004] is a monoidal structure on time; Mazzola's *Topos of Music* [2002] models musical objects as presheaves. Both relate the score's structure to its denotation.
- **Realize and Shorten**: `realize` is a functor from a program (a diagram) to signals (events); Shorten goes back. *Hypothesis:* Shorten ∘ realize is a retraction onto canonical forms (Shorten's idempotence is already wanted, #142). Whether they form an adjunction is an open question, not a claim.
- **The tower** as a poset of scales under refinement, each cell an interval in it, isometries its arrows: a cell graph that respects the tower would be a diagram over that poset.

## The implicit `&out`

The owner's idea: *every output not overridden by something else is hot and wired to the sound card.* It fits the picture: the card is the outside, so a sound that nothing reads on falls out of the bulk to the boundary.

**Measured** (the same probe): over the 68 examples only 16 cells are read by nothing (notes, meters and the card aside): 12 tables drawn for show and 4 waves in *Waveforms*, and **no voice or mix**. So the library would barely notice. Open, ⚖ owner, because it could change saved pieces: a piece of one's own that keeps a voice unconnected on purpose would start to sound. Options: only when no sound card is written; or a written `&out` overrides (its level, channels, `map=sample`) and every sound it doesn't take still goes out. In the editor it is a feature: patch a voice and hear it at once.

## The owner, second round (2026-10-09)

**Direction: selectors at the bottom, gating the input** (not guarding the output). Recorded as the direction to explore under the inversion above, not yet a decision on the spelling (#29). Rows by the tower ([#239](https://github.com/yggi/cell-studio/pull/239)) measured what today's spelling costs when drawn that way: a selector placed by its clock drags its parts' sound down after it (47 of the downward wires per seed). A rule came out of it: **a node sits where its output lives** (at the rate of what it sends on). Today's selector sends sound, so it belongs with the sound; one that sends gates would sit at the bottom by the same rule.

**Hypothesis: Bach towerizes well.** Strict metrical nesting (a figure that fills half a bar, a bar of chord shapes, a tempo map over the sections) is the clean isometry case: each child's turn at its parent's step. Testable with the isometry condition (lead 3) and rows by the tower on BWV 847, the Ricercar, Pachelbel and the canon against the rest of the library. Measured (rows by the tower, [#239](https://github.com/yggi/cell-studio/pull/239), three seeds): on the seven contrapuntal pieces crossings 3.7 → 4.0, cost 9.7 → 4.3, and height follows the tower far better (ρ 0.64 → 0.81); over the whole library crossings 25 → 68, two thirds of it in the 10 pieces arranged by a selector. So far, yes.

### Shorten, the secret hero: a ratchet

Shorten (`src/engine/shorten/`, [../ui/shorten.md](../ui/shorten.md)) is the one part of the app that goes from the boundary inwards: it reads what is written out and folds it, one rule a file (runs, phrases, fractions, same cells, wrappers …), measured by the code's length and checked note for note. That is renormalization by compression: a minimum-description-length step [Rissanen 1978]. `phrases.ts` (a phrase written twice becomes a cell) is the same idea as Sequitur's grammar induction [Nevill-Manning & Witten 1997]; a library of abstractions grown by compressing a corpus of solutions is DreamCoder's [Ellis et al. 2021].

**The ratchet** (the owner's): can Shorten find the folded shape from the unfolded one? Each stage moves the input further out towards the boundary; each is scored over the library and recorded as a baseline that may not get worse, as the layout's is (`quality.baseline.json`):

| stage | input | what is lost on the way out | what counts as found |
|---|---|---|---|
| 0 (today) | the examples' text | nothing | what Shorten still finds (`tools/corpus.mjs`) |
| 1 | each example unfolded: every voice's notes as one flat braid (`realize`) | names, cells, tables, meters | the same notes (exact), and a description length at or under the original's |
| 2 | MIDI out → MIDI in (#203) | also pitch spelling against a table (a scale degree becomes a key number), the mix (a velocity), the voices (a channel) | the same notes as MIDI; cells modulo renaming |
| 3 | audio of our own synth | also the notes themselves | the same render within −100 dB (`tools/repeatable.mjs` already compares two renders) |
| 4 | any audio | also the instruments | a transcription first (e.g. basic-pitch [Bittner et al. 2022]) |

- **The inverse is ill-posed**: many programs play the same notes. So the score is not "the original text back" but **equal sound and description length**, with the original as a reference point, not the answer. Where Shorten finds a shorter program than the hand-written example, that is a finding about the example.
- Stage 3 is easier than it sounds for our own pieces: the voices are known and the renders repeat, so it can be analysis by synthesis (try a candidate, render, compare), not general transcription.
- **Pipeline, not a bigger Shorten**: an unfolder (`realize` exists), a reader per format (MIDI in exists in part, #207), a folder (Shorten, its rules extended from text to events), a judge (the snapshot's note hashing, the render comparison). Pure TS in `engine/`.
- The ultimate roundtrip, `pop.cells → wav → pop.cells`, is stage 3 on *Pop*; done means: equal render, equal or shorter text, the graph the same modulo the equivalences below.

**α and β** (the owner's terms): in the λ-calculus α-equivalence is renaming bound names, β-reduction is substituting a definition where it is applied [Barendregt 1984]. For cells:

- **α**: renaming cells (names are bound variables; two pieces are α-equal when their graphs are isomorphic with the names forgotten).
- **β**: inlining a cell where it is used, or the reverse, factoring a phrase into a cell (`&( … )` against a named cell; Shorten's phrases and wrappers are β-expansion). Different layering is mostly β.
- **A pushback on the naming**: "changing what goes to `&out`" (rerouting the mix) is not β in the λ sense; it is an equation of the mix algebra (decision 006: `+` and `*` commute; gains distribute) and of time (#142's laws). So three equivalences, not two: **α** (names), **β** (inline / factor), and the **algebra's laws**. A canonical form is a normal form modulo all three (#151), and the ratchet's judge compares pieces modulo them.

### Meta-machines: a radio, a jukebox

The owner: *pop, but with enough choice and freedom that it is not one pop song but an endless cycle of them, a radio station; and a meta-meta-machine, the shape of Cell studio itself: which `.cells` file is open is just another selector, driven by the user; the examples are points in a continuous musical phase space; at the top, `free()` sliders for genre axes derived from the corpus: a universal jukebox, a radio with a style vector.*

- **It fits the tower exactly**: a radio's song selector turns once every few minutes (millihertz), the file choice slower still. Both are selectors at the bottom of the tower, gating what is above them: the owner's direction for selectors, one level further down. The library is the deepest layer of the bulk.
- **A machine of songs is a piece with selectors and `free()` at its slowest levels**: a template (a form, a progression, a groove) whose choices are made by `chance`, by the listener, or by the clock. Nothing new is needed for a first one, beyond the selector work (#29).
- **The phase space is not yet continuous.** Programs are discrete; two examples have no shared coordinates, and halfway between *Pop* and BWV 847 means nothing until both are written in one parameterized form. Two routes: (1) **families**: pieces that share a canonical form up to their `free()` values are a manifold (the ratchet's canonical forms find them); (2) a **learned latent space**, as MusicVAE does with its hierarchical, multiscale decoder [Roberts et al. 2018], at the price of interpretable axes. Cell studio's advantage is that its axes can stay interpretable: tempo, mode, density, swing, syncopation, register, timbre are attributes, not latent dimensions.
- **Genre axes from the corpus** need a corpus: 68 examples are too few. The ratchet's stage 2 makes one: a MIDI corpus (e.g. the Lakh MIDI Dataset [Raffel 2016]) folded into cells is a corpus of programs, and the axes come from those (a factor analysis of their attributes and shapes). So the meta-meta-machine depends on the ratchet.

## Practical leads

1. **Rows by the tower** (measured: [#239](https://github.com/yggi/cell-studio/pull/239); the best tower-shaped layout, zones with the signal path within, costs 46 crossings against today's 25 and leaves 65 % of wires going up) (a layout probe like `upPull`): y ≈ −log(time constant), a node a span from its turn to its step; measure crossings and cost against today's rows (`tools/probe/`). The selectors and meters are the test: where do they land, and does the layout get better or worse?
2. **The tower drawn**: a log-frequency axis at the side, the zones marked (DC, sub-Hz, pulse, rhythm, audible), each node's span and a line to its anchor; audio sources tap it at the height they sound now; no `&out` node.
3. **The isometry condition, measured**: for each parent and child (a splice, a `step=`), the ratio of the child's turn to the parent's step. Near 1, nesting is clean; far from it, something crosses a block (a disentangler, or a mismatch).
4. **The disentangler inventory**: every row of the reference in the four primitives (shift-with-carry, dilate, look up, combine), what doesn't fit, and how it meets #151 and #179.
5. **Junctions as nodes, then gates from the form**: the fold optional (probe 2 of the outputs probe, [#236](https://github.com/yggi/cell-studio/pull/236)), then a selector's gates into parts' junctions instead of their sound through it; BWV 847 without `&tacet`s as the test piece.
6. **Shorten as renormalization**: does the tree Shorten finds match the piece's metrical levels? A comparison with GTTM's time-span trees on pieces in both (Hamanaka's database has many tonal classics) would be a real benchmark.
7. **A rhythm scalogram**: a continuous wavelet transform of the *onsets* (not the audio) shows the metrical hierarchy as ridges from the boundary [Todd 1994; Smith & Honing 2008]. Computed from realized events it is pure TS and cheap (`engine/` or `layout/`); its ridges against the cells' turns checks the tower from outside. The audio's own scalogram (constant-Q) is the card's view; below 20 Hz only the onset scalogram sees anything.
8. **Path consistency**: Lewin's condition as a lint over the graph's transforms.
9. **1/f**: music's fluctuations follow roughly 1/f [Voss & Clarke 1975], the critical regime MERA was made for; a piece's onset scalogram slope would say how "critical" it is, and whether disentanglers (cross-block operations) correlate with it across the library.
10. **The ratchet, stage 1**: every example unfolded to flat braids, Shorten run on it, scored (equal notes, description length against the original); recorded as a baseline. Then MIDI (stage 2, #203), then our own audio (stage 3).
11. **Bach towerizes**: the isometry condition and rows by the tower on the contrapuntal pieces against the rest.
12. **A first song machine**: *Pop*'s form, progression and groove as choices at the slowest levels, so it plays a different song each lap; the radio's selector the next level down.

## Open questions

1. Where a node sits on the tower: its step, its turn, or both as a span (proposed: a span).
2. Whether the selector's output becomes gates and local time (a new reading or a new port), and what that does to #29's `restart=`.
3. The implicit `&out`: always, or only without a written card.
4. Whether soft time (swing, wow, varispeed) is a fifth primitive.
5. Whether the tower layout replaces the layered rows or guides them (a pull, as `upPull`), and what becomes of the graph's width when everything at one scale is in one row.
6. The ratchet's score: equal notes and shorter text, or closeness to the original's structure too (and how to measure that modulo α, β and the algebra).
7. Whether a song machine's choices are `chance`, `free()`, or a new kind of selector driven from outside (the listener, the radio).

## References

- Barendregt, H. P. (1984). *The Lambda Calculus: Its Syntax and Semantics* (rev. ed.). North-Holland.
- Backus, J. (1962). Die Reihe: a scientific evaluation. *Perspectives of New Music* 1(1), 160–171.
- Bittner, R. M., et al. (2022). A lightweight instrument-agnostic model for polyphonic note transcription and multipitch estimation. *ICASSP 2022*. (basic-pitch)
- Biamonte, J. D., Clark, S. R., Jaksch, D. (2011). Categorical tensor network states. *AIP Advances* 1, 042172. [arXiv:1012.0531](https://arxiv.org/abs/1012.0531)
- Coecke, B., Kissinger, A. (2017). *Picturing Quantum Processes*. Cambridge University Press.
- Cowell, H. (1930). *New Musical Resources*. Knopf.
- Daubechies, I., Sweldens, W. (1998). Factoring wavelet transforms into lifting steps. *J. Fourier Anal. Appl.* 4(3), 247–269.
- Ellis, K., et al. (2021). DreamCoder: bootstrapping inductive program synthesis with wake-sleep library learning. *PLDI 2021*.
- Evenbly, G., White, S. R. (2016). Entanglement renormalization and wavelets. *Phys. Rev. Lett.* 116, 140403. [arXiv:1602.01166](https://arxiv.org/abs/1602.01166)
- Evenbly, G., White, S. R. (2018). Representation and design of wavelets using unitary circuits. *Phys. Rev. A* 97, 052314. [arXiv:1605.07312](https://arxiv.org/abs/1605.07312)
- Fong, B., Spivak, D. I. (2019). *An Invitation to Applied Category Theory: Seven Sketches in Compositionality*. Cambridge University Press. [arXiv:1803.05316](https://arxiv.org/abs/1803.05316)
- Hamanaka, M., Hirata, K., Tojo, S. (2016). Implementing methods for analysing music based on Lerdahl and Jackendoff's Generative Theory of Tonal Music. In *Computational Music Analysis*, Springer.
- Hudak, P. (2004). An algebraic theory of polymorphic temporal media. *PADL 2004*, LNCS 3057.
- Lerdahl, F., Jackendoff, R. (1983). *A Generative Theory of Tonal Music*. MIT Press.
- Lewin, D. (1987). *Generalized Musical Intervals and Transformations*. Yale University Press.
- London, J. (2012). *Hearing in Time* (2nd ed.). Oxford University Press.
- Mazzola, G. (2002). *The Topos of Music*. Birkhäuser.
- Nevill-Manning, C. G., Witten, I. H. (1997). Identifying hierarchical structure in sequences: a linear-time algorithm. *J. Artificial Intelligence Research* 7, 67–82. (Sequitur)
- Popoff, A., Andreatta, M., Ehresmann, A. (2015). A categorical generalization of Klumpenhouwer networks. *MCM 2015*, LNCS 9110; Relational poly-Klumpenhouwer networks (2018), *J. Math. Music*, [arXiv:1611.02249](https://arxiv.org/abs/1611.02249); Groupoids and wreath products of musical transformations, [arXiv:1801.02922](https://arxiv.org/abs/1801.02922).
- Raffel, C. (2016). *Learning-based methods for comparing sequences, with applications to audio-to-MIDI alignment and matching* (PhD thesis, Columbia University). (the Lakh MIDI Dataset)
- Rissanen, J. (1978). Modeling by shortest data description. *Automatica* 14(5), 465–471.
- Roberts, A., Engel, J., Raffel, C., Hawthorne, C., Eck, D. (2018). A hierarchical latent vector model for learning long-term structure in music. *ICML 2018*. (MusicVAE)
- Smith, L. M., Honing, H. (2008). Time–frequency representation of musical rhythm by continuous wavelets. *J. Math. Music* 2(2), 81–97.
- Spivak, D. I. (2013). The operad of wiring diagrams. [arXiv:1305.0297](https://arxiv.org/abs/1305.0297)
- Stockhausen, K. (1957). … wie die Zeit vergeht … *die Reihe* 3 (English: … how time passes …, 1959).
- Swingle, B. (2012). Entanglement renormalization and holography. *Phys. Rev. D* 86, 065007.
- Todd, N. P. M. (1994). The auditory "primal sketch": a multiscale model of rhythmic grouping. *J. New Music Research* 23(1), 25–70.
- Vidal, G. (2007). Entanglement renormalization. *Phys. Rev. Lett.* 99, 220405; (2008) Class of quantum many-body states that can be efficiently simulated. *Phys. Rev. Lett.* 101, 110501.
- Voss, R. F., Clarke, J. (1975). '1/f noise' in music and speech. *Nature* 258, 317–318.
