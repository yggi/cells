# Nets: what an edge is

**2026-10-07 · open: decided in part (below), steps 1–2 and 5 built (1 with its transforms, #146), 3 begun, belts counted, ends locked, buses gathered · #9, #10, #27, on top of PR #136 (the gallery)**

The golden graph (`node tools/gallery.mjs golden`, PR #136) puts every kind of wheel and edge into one picture, so the flaws of the edge model show up together. This note collects what it shows, proposes one model under all of them, and splits the work into small steps. The owner's input that started it: **nets and buses** (an edge carrying `[0,4,7]` is a 3-wire bus); **edges by the signal they carry** (sync, CV, audio); **a palette that maps values to colours**; **named networks with in and out**, which unify tape heads and the meter's net, where today's edge syntax is the anonymous shorthand (like `&( )` cells).

![mock-up: bands, buses, named nets, junctions](nets-mockup.png)

*A mock-up for discussion, drawn by hand, not by the app.*

## Decided (owner, 2026-10-07)

1. **Every arrow follows the flow.**
2. **A product is an unnamed junction node**, shorthand for a node that could be written out with a name (as `&leadA [&walk * &lead * .3]` already is), the same way `&( … )` is shorthand for a named cell.
3. **Refs and `over=` are pointers**: indirections, reference values. `over=` is still drawn as a wide bus, because the bus is how the notes go from the scale's wheel to the theme's.
4. **Three fundamental bands** (sync, CV, audio). Visual variations come from `show=`.
5. **Syntax: the new operators come later** (after the drawing). The owner's sketch is `&<foo` (from net `foo`) and `&>foo` (to net `foo`), as in `&foo step=&<meter`. Worked through below.
6. **The canon may change:** go for the clean form, and rewrite the examples rather than keep a spelling for their sake.
7. **`show=` is decoupled between the node and the net:** a cell's `show=` says how its wheel is drawn, and its net's (the taps') drawing gets its own say.
8. **A net's style is set by its owner**: the cell whose net it is, once for all its taps, not each place it is read.
9. **How it is said:** an attribute of its own on the owner, or a decorator on the reference to the net (a tap written with its style). Not `show=`.
10. **Belts count, twice.** A belt is drawn over the wheels, two runs: every edge or wheel it crosses counts once per run.
11. **The sun dissolves into two mechanisms** (worked through below): a source of absolute time, a sync net like a meter's; and `show=brightness`, a way to draw any mode wheel.
12. **Angular locking:** a braid's edge meets its segment, generalizing a tape's heads.
13. **A step between two turntables is a belt** (built: `GraphEdge.belt`, `rigid` without `belt=`, as the tape on its capstan).
14. **A table's strands leave at their entries and gather into a bus towards the reader** (built: `busStrandPath`).
15. **Meter rings retired** (built): the net says which meter steps a cell.
16. **Placed-last for meters can be retired.** Tried, not done: see step 9.
17. **A tape and a chorus line up** (the owner likes it): a chorus is a tape with short, wandering heads, as a canon is one with long ones. A net with delayed taps covers all three.
18. **The wheels need distinguishing by role**, not only by their hub text: proposal under "The wheels".
19. **A resonator's tines are its inputs** (the owner pointed at the Kalimba; built): a tune into a resonator with more than one exciter is a bus as wide as its tines; its strands end at the pads, each in its pitch's colour, lit while its tine rings (`ctx.resonance`), as a tape's heads are its inputs and outputs.
20. **Strands run as a cable loom** (built: `loomPaths`): out of each entry at a right angle onto a ring round the wheel, round it on a lane each, off it where it faces the reader into the bundle. Refs keep their own curl into their segment.
21. **Instruments and read heads show waveforms, mixes spectra** (built): a voice's plain show is `wave` (one cycle stopped, the sound itself while it plays); `show=spectrum` still asks for the spectrum.
22. **Placed-last retired** (built): a meter is laid out with the cells it steps, held by springs that aren't drawn; library crossings 76 → 89, accepted.
23. **The Kalimba reads through its tines** (built): `&tune over=&kalimba`, one bus at the pads.
24. **Only the sound card shows a spectrum**; mixes show waveforms (built).
25. **Nets are a backbone**: the meter's net is a wide trace (built, 9 px). The net approach is to be built out beyond the meter's net (below).
26. **Layout by mass and strength** (the owner's idea): each node has a mass, each edge or net segment a strength (below).

## What the golden graph shows

Measured over the 52 examples and the golden piece (`buildGraph` compared with the `&name` tokens written on each line):

- **Edge direction is half pull, half flow.** `over`, `step`, `ref`, `couple` and `about` point from the cell that writes the name to the cell named (the reader to what it reads). `mix`, `fm`, `lpf`, `excite`, `write` and `play` point the other way, along the signal. You can't tell from an arrow which way sound or time goes.
- **The graph draws edges no line writes, and leaves out names that are written.** `[&theme * &flute]` on `&out`'s line is drawn as `&theme → &flute → &out`. That is 223 `out` edges no line writes, and 218 written names (`&theme` on `&out`'s line) with no edge. The product is folded into the voice, so a voice turns into a hub. In the golden graph `&lead` has five melodies in and three mixes out, and the picture can't say which melody goes to which mix.
- **`out` means 13 things.** It is melody into voice, envelope (`×`), level (`×`), vibrato (`+`), `lpf`, `hpf`, `lpq`, `fm`, `excite`, `couple`, `write` and `play`. The `pick` field holds a port name, a shift (`[<<]`) or a transposition (`^7`). The `label` field holds an operator, a gain or a rate (`÷2 · belt`). Port, transform and multiplicity are mixed into two strings (`src/engine/graph.ts`). The edge sheet's 30 kinds are these strings, not 30 concepts.
- **The meter's net is the only edge that is already a net, and the layout makes it, not the engine.** `ForceLayout.meterNet()` builds a spanning tree over the cells a meter steps. It works, so it should be the general case rather than the exception.
- **A written name with no edge.** `&sun sun=&cycle` draws no edge, so the sun floats off.
- **Colour belongs to the kind, not to what the edge carries.** A step edge is accent-tinted, `excite` magenta, a belt brown, a meter's net yellow, and a live edge takes its note's colour. Kind colours and value colours compete.
- **Lines through wheels.** Belts and the meter's net run under two turntables (PR #136's follow-ups).

## The model, proposed

### 1. An edge is a name written on a line

`&a` written on `&b`'s line is one edge, `a → b`, always in the direction of flow: from what is read to the cell that reads it. The **port** is where the name is written: `step=`, `over=`, `lpf=`, `write=`, the braid, a slot of a mix. That gives one rule for direction. It also makes code and graph a bijection: every `&name` token is an edge, every edge is a token, and selecting one selects the other.

### 2. A product is a junction

`&theme * &lead` is an unnamed cell, the same as `&( … )`. It is drawn as a small junction: the melody goes in, the voice is its definition (a dotted "is a"), and its sound goes out to the mix. The 223 edges no line writes disappear, and the 218 missing names get their edges. Voices stop being hubs (mock-up D).

### 3. Three bands

A wire carries one of three things. The **port** decides which, not the cell: `&bar`'s ticks drive `&theme` (`step=&bar`), and the same `&bar`'s values can be read as a melody somewhere else. In modular terms a cell has up to three outputs (gate, CV, audio), and a port reads one of them.

| band | carries | ports | transforms on the tap | drawn |
|---|---|---|---|---|
| **sync** | ticks: gate, trigger, clock | `step=`, `loop=&x`, `cycle(&x)`, `at=&bar`, `delaytime=&bar/2`; the gate half of melody → voice | `×n` `÷n` `⟳` `belt=` | thin, dotted, pulses travelling |
| **CV** | values: pitch, level, envelope, table, `lpf` | `over=`, braid refs, `+` (vibrato), `×` (level, envelope), `lpf=` `hpf=` `lpq=` `index=`, `write=` of notes; the pitch half of melody → voice | `+n` `^n` `×g` `[<<n]` `[a:b]` | solid, coloured by its value now |
| **audio** | sound | entries of a mix, the sound card, `fm=`, `excite=`, `couple=`, `write=` of sound, a sound tape's `play=` | `×gain`, `at=` | thick, rippling at its pitch |

Most of this is already written down. `engine/attributes.ts` marks `moves` (a CV port) and `clock` (a sync port), and decision 006's sorts map onto the bands: pitch and volume are CV, signal is audio. A **wave** is the one case where the rate moves a cell across a band: an audio-rate wave summed into a pitch is FM. `about=` is not a signal. It stays a layer of its own (notes), drawn as now.

Melody → voice carries two bands at once: gate and pitch, the way MIDI to CV does. It is a 2-wire bus.

### 4. Width: buses

A wire is as wide as the number of values the source holds at once:

- a chord `[0,4,7]` is 3 wires
- a table read through `over=` is its length (`&mode`: 7)
- a selector's `[0,1]` picks 2 wires of a table of parts
- the sound card is 2 (L R)

100 cells in the examples write chords, 2 to 8 wide. A bus is drawn as parallel strands, each coloured by its own value. That is the braid in the edge.

### 5. A tap is (net, transform), and a cell is a net

Every cell is a **net**. What writes to it is its *in*: a meter's motor or rate, a tape's `write=`, a mix's entries, a melody's own braid. Every place its name is written is a *tap*, an *out*, with a transform. The labels of today's edges are those transforms. Four things that look different turn out to have the same shape (mock-up C):

| net | in | taps | transform |
|---|---|---|---|
| a tape | `write=&tune` | `play=&tape` heads | `at=.375` (a delay) |
| a canon | its braid | `&john`, `&john[<<1]`, `&john[<<2]` | `[<<n]` (a delay, in steps) |
| a meter | motor, bpm | `step=&bar`, `step=&bar/2 belt=30`, `step=cycle(&bar)` | `×n` `÷n` `⟳`, a spring |
| a mix | `[a, b, c]` (summed) | each place the mix is played | `×gain` |

So **the existing syntax is the anonymous form of a named net**: `step=&bar/2` means "tap the net `&bar`, divide by 2". No new syntax is needed to get the model and the graph right. It is needed only where one thing has two spellings or can't be said. The first such pair: **`&john[<<1]` and `play=&john at=…` are the same tap** (a delay, in steps and in seconds). A canon is a tape with three heads. Whether one becomes the other is a #10 question (orthogonality, item 2), below.

### 6. One palette: value → colour

One function, `palette(band, value)`. Kinds get no colour of their own. The band sets the stroke (dotted, solid, rippling), the width sets the strands, the value sets the colour:

- **CV pitch:** the pitch-class rainbow already in use (`noteColour`, grid-aware, [tuning.md](../language/tuning.md)), muted by octave.
- **CV level** (envelope, gain, `lpf`): lightness on one neutral hue.
- **sync:** the meter's levels, which already exist as tokens (`--meter-0` downbeat … `--meter-3`), flashing on the tick.
- **audio:** the hue of its fundamental, as bright as it is loud (`scopeBand` already does this for the scope).

That removes six kind colours (the step tint, excite magenta, belt brown, meter yellow, the about grey, the live accent) and leaves one rule. **Built** (#34): `palette(band, value, grid)` in `src/ui/palette.ts`; where the grid comes from, the owner's rule, in `heardGrid` (`src/layout/show.ts`): a mix hearing several grids shows no colour unless its `show=mix:&grid` names one.

## Syntax: `&x`, `&<x`, `&>x`

The owner's sketch, read together with decision 3 (refs and `over=` are pointers): **a name can mean the cell or what is on its net.**

| written | means | today | new power |
|---|---|---|---|
| `&x` | the cell itself, a pointer: splice it, index it, play it as a voice | every `&name` | none |
| `&<x` | a tap: what `x` actually played, on one timeline | `play=&tape`, `step=&bar` | a head on any cell, not only a tape |
| `&>x` | a send: this cell's output also goes into `x` | `write=&tune` (written on the other line) | aux sends: many cells feed one net without it listing them |

- **The tape, written both ways.** Today, the pull form: `&tape step=&reel write=&tune length=6` and `&near play=&tape at=.375`. The push form: `&tune … &>tape` and `&near &<tape at=.375`. Both spell the same edge. Only the token's line differs, so the graph doesn't change.
- **An aux send:** `&lead s=saw … &>verb*.3` with `&verb room=.9`. Today `&verb` would have to list every input itself (`&verb [&lead*.3, &bass*.1]`). With `&>`, the inputs name the net instead, and `&>verb*.3` is a mix entry written on its source's line.
- **Where `&<` differs from `&`.** A port that can only take a signal needs no arrow. `step=` can only follow a running clock, so `step=&bar` is already `step=&<bar` and stays the shorthand. The arrow matters where both readings fit: a braid or a mix. There, `&john[<<1]` is a **copy**, the braid replayed a step later. `&<john[<<1]` (or `at=`) would be a **tap**, what `&john` played a step ago. They differ once something happens only once: a `free()` moved by hand, a belt slipping, a turntable held, a restart. A canon from copies keeps the score. A canon from a tap echoes the performance.
- **Parsing:** `&<` and `&>` are free. Nothing else follows `&` with `<` or `>` (picks are bracketed, `&t[<<n]`), and a mix has no comparisons.

**Recommendation.** Add no syntax until steps 2 to 5 are drawn. The model and graph need none, since every existing form is the shorthand. Then add `&>` first, because it is the only one that says something new (a send). Add `&<` only if the copy/tap difference turns out to be heard in a real piece. Each one gets a decision record (#10, item 2: one edge, two lines to write it on).

## The sun, dissolved (decision 11)

Today one cell does two jobs: `&cycle law=fiveto12 anchor=11.55 step=84bpm` computes notes from a time of day, and `&sun sun=&cycle` draws that day as a 24-hour dial whose rim shows the twelve modes by brightness. Split:

- **A source of absolute time.** A cell that is the clock of the world, as a meter is the clock of a bar: its net is sync, and it is tapped by unit: seconds, minutes, hours, the day of the week, the week in the month and in the year, the day in the year, the month. Its own attributes: where it starts (`anchor=`, today on the law) and how fast time runs (1 the real one; faster to hear a day in a minute). A law reads it instead of keeping its own anchor. The tap's unit is part of the reference, so the open question is the spelling: a pick (`&now[hour]`), a rate like a meter's (`step=&now/hour`), or a decorator once `&<` exists.
- **`show=brightness`**: a way to draw a mode wheel (or any table read as modes), its segments shaded by how bright their mode is (Lydian 1 … Locrian 0, today the sun's `blockColour`). The sun's dial becomes: the time source drawn as a 24-hour face, beside a mode wheel with `show=brightness`.

Nothing is built yet. *5 to 12* is the only example, and it would be rewritten (decision 6: the clean form, not the old spelling).

## How it unlocks #9 and #10

- **#9, PR 3 (`Graph.svelte`, a pure tested `flowedges.ts`).** Once an edge is `(net, port, band, transform, width)`, `pulseData`'s special cases (`play`, `write`, `out`, `mix`, `step`) become one lookup, and `flowedge.ts` becomes a pure function worth testing. *Done in #144:* `ui/flowedges.ts`, one lookup by band and port, tested against the special cases on every example's edges. #132 (`voices.sync` and `routing.ts` disagreeing about where sound goes) gets one source: both read the same nets.
- **#10, item 2 (orthogonality).** Taps give each set of equal spellings one canonical form: one delay (`[<<n]` and `at=`), one rate transform (`step=&x*n/m`, `cycle(&x)`, `loop=`), one gain.
- **#10, item 6 (naming).** "Units fixed by kind" *is* the band: a sync port takes a clock, a CV port takes semitones or a 0–1 level, an audio port takes sound. "Any parameter may be a cell" means any port takes a tap of its band. Which parameters can move stops being arbitrary: the CV ports.
- **#27 (layout).** Direction, junctions and nets are what the forces read. The meter's net moves from the layout into the engine, and the layout only places it.

## Steps, one at a time

Each step is its own PR, each visible in the golden graph and the edge sheet (before and after), and each keeps saved pieces and sound unchanged until step 6.

0. **Land #136** (the gallery). It is the yardstick.
1. **The model, no visual change. Built.** Every `GraphEdge` is also a wire: `port`, `band`, `pointer`, `width`, and `from` → `to` along the flow (`src/engine/graph.ts`, tested in `graph.test.ts`). Over the examples:

   | port | band | edges |
   |---|---|---|
   | `braid` (a ref) | CV, pointer | 251 |
   | `about` | none | 246 |
   | `step` | sync | 231 |
   | `mix` | audio | 230 |
   | `voice` (melody → voice) | CV | 192 |
   | `over` | CV, pointer | 113 |
   | `lpf` `hpf` `lpq`, `level`, `pitch` | CV | 39 |
   | `fm`, `excite`, `couple` | audio | 14 |
   | `write`, `play` | CV on a tape of notes (4), audio on a tape of sound (14) | 18 |

   Widths: `over` buses are 4 to 25 wide, and 95 and 96 for the two chord tables of the Prelude. Chords on `voice` and `braid` edges are 2 to 8. No example puts an audio-rate wave into a pitch sum, so audio on `pitch` (FM) is seen only in the unit test. 

   **The transform, as data** (#146). A wire carries `transforms`, one per place its name is written on the reader's line (a ref written three times: three), each a list of steps (`src/engine/transform.ts`): a pick (`[a:b]` `[i]` `[::-1]`), a delay (`[<<n]` in steps, a read head's `at=` in tape-seconds), `degree`, `inverse`, a transposition (`^n` grid steps, `+n` semitones), a negation (`−` in a pitch sum), a gain (×g in a mix), a rate (`×n` `÷n` as written, `⟳` per cycle, `loop=`, `belt=`). `pick` and `label` are gone: the edge's label is drawn from the port and the transforms by one pure function (`edgeLabel`), and `kind` with them: every reader asks the port (`feeds(e)` for what was `out`: every port but `over`, `braid`, `step`, `mix` and `about`). `graph.test.ts` reads every `&name` written on every line of the examples and the golden graph back from the text (not through the parser) and checks each is a wire carrying the transform it writes; the names in a mix's products wait for junctions (step 4), and `delaytime=&bar*3/4` draws no wire yet. A voice in a mix keeps its first entry's gain, a melody into a voice its first output's, until the products are junctions. Labels now say what was written and hidden: a read head's `at=`, a ref's pick or shift (`[::-1] ^8`, `[<<] ^-12`), a number in a pitch sum (`[<<] −7`); more than three different transforms on one label end in `…`. **Stereo:** a voice into a sound card of two channels is a wire 2 wide (L R); the drawing doesn't change (an audio wire has no strands), and the layout weighs sound as one wire, so no layout moves.
2. **One direction. Built.** The flow edge is drawn `from` → `to` (`src/ui/flowedges.ts`), so a pulse always runs along the signal: the step edge's reversed pulse is gone. `sun=&cycle` is an edge, and the sun sits by its law. That costs crossings: the golden graph's bound goes from 4 to 6 (the sun now sits among the belts), and *5 to 12* goes from 0 to 1. Not done: the layout still turns each kind round by hand (`flowRanks`, the consumers in `physics.ts`). Each of those turns already reads along the flow, but `layered.ts` remaps `source` and `target` without `from` and `to`, so it is a refactor for later (#27), with no change in the picture.
3. **Bands and palette. Built** (#34). In `PulseEdge` and `edges.css`, sync is dotted, audio is a wave (`ripplePath`), and CV is solid; the step edge's accent tint and the `over` edge's dashes are gone. Every colour is now the palette's (`src/ui/palette.ts`, §6): a live edge takes its value's colour (a ref or a melody the note under the playhead, a level the neutral hue, a step the tick's level, sound its fundamental, a mix's sound neutral: it carries several), the pulse dot its edge's, a belt the clock's tick between the edge at rest and `--meter-0` as it pulls (a slip `--danger`, a state), an `about=` link the edge at rest (it carries nothing). `excite` had no colour of its own: it is sound, coloured as sound. A meter's net keeps its meter's own colour at rest (the ring its cells wear, its name: an identity, not a kind) and flashes to the tick's level token on each step. The spectrum wheels of voices, mixes and the sound card colour their bands through the palette too, by the owner's rule (`heardGrid`). Open: the meter tokens are both a meter's identity (rings, names) and the sync levels; with two meters, the second's ring (teal) and its net's downbeat flash (gold) differ.
4. **Junctions.** Products become small anonymous nodes, and voices become definitions. This is the biggest layout change: watch the golden graph's crossings and the library's overlap count ([limits.md](../limits.md)).
5. **Buses.** Built for tables and chords: an `over=` edge is a bus, a strand per entry in the colours its wheel gives them (at most 12), and while it plays the entries looked up now are lit, the others dim. A CV edge carrying chords (melody → voice, a ref) is a strand per note: stopped, neutral; playing, the notes under the playhead of the cell it comes from, in the colours of that wheel's rings (the rest dim). A kit's strands are grey: its entries are voices. The golden graph's facets now include the band and the bus (`facets.ts`), so its `&theme` has two chords. Still to come: stereo, and the owner's style for its net (decision 8).
6. **Named nets.** The meter's net comes from the engine. Tape heads and a canon get one drawing. Then the language question, `[<<n]` and `play= at=`, goes to a decision record.
7. **Belts counted. Built.** `drawnCrossings` (`quality.ts`) takes a belt as drawn: its two runs, over the wheels, each counted against every edge and every wheel but its own two. The layout keeps belts short (a stiff, short spring) and places a meter with a belt where the belt crosses least (`placeMeters`: its length, with every crossing ×4 per run, beside the net's cost). The golden graph went 6 → 26 when belts were first counted, and is back at 6 with the placement. The library went 74 → 86, and is now 75: *Tape Machine* is tighter with the same crossings, and *Automaton* has one more.
8. **Angular locking. Built** for refs and tables. A ref's edge meets the wheel of the cell it is spliced into at the segment where it sits, once per time it is written (`&tune &up &up`: two strokes, at 3 and 9 o'clock). A table's strands leave its wheel from their own entries. The ends arrive along the radius from outside (`radialPath`), as a tape's head meets its reel, because edges are drawn under the wheels. The layout still bends edges between centres, so a locked end can swing round its wheel; to come: the layout knowing the ends.

   **Locking and a moving shift** (owner, 2026-10-07). Two kinds of wheel behave differently:
   - **A table's wheel is drawn in pitch space.** Turning it (`shift=`, a stepped table, a hand) keeps every segment where it is, with the same hue; only which degree sits there changes (`cellView`'s `index`). So a locked strand never moves: the scale turns under it, the way tape moves under a fixed head. Only its meaning moves, which entry is looked up there. That was a bug: the edges read the static shifts while the wheels draw the live ones (`CellGlyph`: `ctx.live?.shifts ?? ctx.shifts`, redrawn on `ctx.turned`), so a turning table lit the wrong strands. Fixed: the edges use the wheel's rule.
   - **A braid's wheel is drawn in time.** A shift turns its units round the rim, so a ref locked to its segment moves with it. Today that happens with `shift=` in the code or a hand turning a wheel (stopped), when the end should follow, like a string tied to a turning wheel. While playing, the live shifts turn stepped tables, which are in pitch space. A braid of refs that turns while it plays would have its ends travel round the rim each turn. Open: let them ride, or unlock them (centre to centre) while the shift moves.

9. **Meters laid out with the rest: tried, not done.** Placed-last (`placeMeters`) searches a grid for the spot where the meter's net and belts cross least. Replacing it with springs that aren't drawn (ground links), so a meter settles among its cells, costs crossings at every strength tried: the library goes from 75 to 89 at best (`GROUND_PULL` .15) and to 95–140 elsewhere, and the golden graph never gets back to its bound. Kept for now. What would retire it cleanly: a force that does what the search does (pushing a meter off drawn edges, towards where its net is shortest), or a net that routes round the drawing.

## The wheels (decision 18)

![wheels by role, a mock-up](nets-wheels-mockup.png)

*A mock-up, drawn by hand.* Today a grid, a key, a scale, a table and a melody are all a full ring of rainbow wedges; only the hub's text tells them apart (`node tools/gallery.mjs wheels --fast`). The finding about shifts gives the line to draw: a grid's, key's, scale's or table's wheel is laid out in **pitch** (a position is a pitch class, fixed; turning it moves the degrees), a melody's in **time** (a position is a step). Let the rim say which:

- **Pitch:** the rim is the grid, a thin rainbow of all its steps. A table's entries are notches on it, one step wide, with the pitch classes it leaves out dark, so a scale reads as a sieve of the circle and a pentatonic shows its holes. A grid is the rim and a dim full ring. A key is the grid with its tonic marked (a pointer at the top).
- **Time:** the rim is a clock, a tick a step (a beat longer), with the steps in order and the hand.

**Built (owner: "do that"):** the pitch rim (the grid's steps, those a table holds bright), the sieve (a wedge shaded past its own step), and the clock rim (a tick a step, longer every four) in `CellGlyph`. Not built: a key's tonic pointer (the existing `zero` mark shows a turned table's first entry). Levels (gold), meters, curves, LFOs and the matrix are already apart. This would also sit well with the buses: a table's strands leave notches, a melody's chord strands leave a segment under the hand.

## The Kalimba: one bus written twice

`&notes 0 2 4 7 9 12 14 16` is the tune's table, and the kalimba's braid repeats the same eight numbers as its tines; a note plucks "the tine nearest its pitch". Drawn as buses, the duplication shows: the same eight colours from `&notes` to `&tune`, and from `&tune` to the kalimba's pads. Two clean forms compile today, with no warning, and play the same notes (the events compared: identical, but for an output's id, which carries its line):

- **`&tune over=&kalimba …`**, without `&notes`: the instrument is the table. A note picks its tine by index, and "nearest its pitch" becomes exact. The graph would then hold one bus both ways between them (the tune reads the tines, and plays them), a question for its drawing.
- **`&kalimba body=tine … &notes`**: the tines come from the table (a ref in the exciters resolves; events byte-identical).

Recommended: the first, as the true form (one bus, read by index). Not changed yet: it is the example's spelling (decision 6 allows it), so the owner's call.

## Next: nets, mass and strength, the sun (discussion, 2026-10-07)

### Nets beyond the meter

Today one net is drawn as a net: a meter's (sync), a spanning tree the layout lays. Everywhere else a cell read by several cells is drawn as one edge per reader. Over the examples, cells read by two or more in the same port:

| port | nets | taps | most |
|---|---|---|---|
| `step` (meters) | 46 | 210 | 16 |
| `over` (tables) | 25 | 77 | 7 |
| `braid` (parts spliced in) | 22 | 48 | 4 |
| `mix` (a voice in both channels) | 22 | 44 | 2 |
| `voice` (a melody playing several voices) | 9 | 20 | 4 |
| `play` (a tape's heads) | 5 | 13 | 3 |

The proposal: **a cell read by two or more is a net**. One trunk leaves it (a table's loom leaves once, not once per reader) and branches at junctions to its readers. A junction is an unnamed node (decision 2), so a net's branch points and a product's junction are the same thing. In the model, `GraphModel` gains `nets` (an owner, its band, its taps). The meter's spanning tree moves from the layout into the model, and the layout lays every net the same way. Drawing: the trunk carries the band and the width (the backbone for sync, strands for a bus, a wave for sound), and each branch carries what its tap takes.

### Mass and strength

One table, as `attributes.ts` is for the language (`layout/weights.ts`):

- **A node's mass** by what it is. A turntable is heavy, and the language's own `mass=` on a motor could be its weight here too. A net's owner is heavy, a table medium, a melody light, a junction nearly nothing. A heavy node moves less and holds more room, so the backbones anchor and light cells settle round them. d3 has no mass: it is emulated by scaling the forces on a node by 1 / mass.
- **An edge's or a net segment's strength** by what it carries. A belt is strongest (a body), a backbone strong, a bus by its width, a wire medium, a note's link weak. Strength is the spring's stiffness *and* what a crossing costs: crossing a backbone is worse than crossing a thin wire. The quality count becomes weighted (a belt already counts twice, which is the first case of it).

This also gives placed-last's job back to the forces: a heavy meter pulled by strong ground segments, which cost a lot to cross.

### The sun, split (refined)

Rates are a table (`RATE_UNITS`: `bpm`, `hz`, `k`, each n per so many seconds). Adding `min`, `h`, `d` and `wk` makes wall-clock time a rate like any other: `loop=1d` turns once a day. Then:

- **A day is a meter:** `&day scan(1!24) loop=1d anchor=11.55` has 24 hours, turns once a day, and stands at 11:55 when play starts. Its taps are the rate chain we have: `step=&day` an hour, `step=&day/60` a minute, `step=cycle(&day)` a day; `&week scan(1!7) loop=1wk` the weekdays. Only the irregular units (a month, the week in a month, the day in a year) need something new, a calendar, and can wait.
- **`anchor=` moves from laws to any clock:** where it stands, in wall time, when play starts.
- **The dial is a day meter drawn as a 24-hour face:** `show=sun` on a meter. The rim of modes by brightness becomes `show=brightness` on the mode table.
- **The law reads the day instead of keeping its own anchor**, and `sun=` and the sun node retire. *5 to 12* is rewritten.

### Built: nets for tables (2026-10-07)

`GraphModel.nets` (`graph.ts`): the edges leaving one cell through one port, two or more (tables, `over=`, so far). The layout places each net's junction (`ForceLayout.junctions`, published with the bends): on the way to its readers' middle, at least 110 px out of the owner's wheel, short of the nearest reader. The first tap draws the trunk (the loom, `loom` in `geometry.ts`, to the junction), every tap its branch from there, one curve per strand that goes on along the trunk's way and round into the branch's. The loom is now one cubic per strand: out along the radius, into its place in the bundle (by angle round the wheel, so neighbours stay neighbours); a strand from the far side dives under the wheel. In the golden graph, `&mode` leaves once and branches to `&motif` and `&theme`. Not yet: the layout's forces don't know nets (a branch can run under a wheel, `&theme`'s under `&near`); that is the weights step.

### Built: mass and strength (2026-10-07)

`layout/weights.ts`: `massOf` (turntable 3, meter 2.5, a net's owner 2, a sound 1.5, a cell 1, a petal .5) and `strengthOf` (belt 3, sync 2, a bus 1 + log₂(width)/3, a wire 1, a note's link .3). The quality report gains `cost`, the crossings weighed by what they cross (the product of the two strengths; a belt over a wheel its own), recorded in the baseline and guarded by the library test. Measured over the library (crossings / cost):

| | crossings | cost |
|---|---|---|
| none | 89 | 139 |
| mass as repulsion | **83** | **128** |
| mass as inertia | 102 | 164 |
| strength as stiffness | 107 | 166 |
| all three | 107 | 172 |
| repulsion ×1.5 / ×2 / ×3 | 94 / 78 / 97 | 142 / 114 / 148 |

The landscape is noisy (×2 is best, its neighbours are worse), so the plain rule is kept: repulsion in proportion to mass. Inertia and stiffness stay as options (`inertia`, `strengthPull`), off: as tried they make it worse. Strength counts, for now, in what a crossing costs.

### Built: nets as a ratsnest (2026-10-07)

The owner: nets are flexible, a moved cell snaps to its best place to attach, as KiCad's ratsnest does. `ForceLayout.taps()` (laid again on every tick, so it follows a drag): the reader nearest the owner takes the trunk straight from it; then, nearest first, each other reader attaches where the tree is nearest to it, anywhere along a segment (a T), kept 30 px clear of the wheels at its ends. Published to the edges as `ctx.taps` beside the bends: null for the trunk's tap, else the point, the segment's way there and the trunk's way out (`phi`), from which each branch keeps its strands at their places (`loomOrder`). The fixed junction is gone. In the golden graph `&mode`'s trunk goes to `&motif` (nearest) and `&theme` tees off near it. Seen in pictures at rest; a drag not seen.

### Tried: grown, as the library is (2026-10-07)

The owner's idea: lay a fresh graph out as the library is (`layout/library.ts`): small first (nodes, edges and repulsion at a fraction of their size), its edges contracting it into its groups, then grown to full size. Built as options (`grow`, `growStart`, `growGather`, `growTicks`, `growShrink`: one scale on the collision radii, the link lengths and the repulsion, ramped smoothly). Measured over the library (crossings / cost) and on the golden graph:

| | library | golden |
|---|---|---|
| not grown (today) | **83** / 128 | 11 |
| from 15 %, 120 + 220 ticks | 102 / 151 | 9 |
| from 30 % | 97 / 153 (overlaps) | 6 |
| 40 + 120 ticks | 111 / 174 | 10 |
| from the layered start (not drawn in) | 107 / 166 | 5 |
| … shorter | 104 / 167 (overlaps) | 4 |
| from 50 %, shorter | 102 / 155 | 5 |

The golden graph gains, the library loses by a fifth: the layered start (rows by the signal path, columns by the voices) already does what gathering does, and growing undoes some of it. Off, kept as options. Worth trying again once nets pull in the layout (their segments as springs), when there is more to gather by.

### Built: the sun, split (2026-10-07)

The owner: the law reads the day via `over=&day`. Built as refined above: `RATE_UNITS` gains `min` `h` `d` `wk`; `anchor=` applies to clocks; `sun=` and the law's own anchor retire. The law takes the offset from its day's anchor (`lawOffset` in `realize.ts`, against 11:55, where the law's cycle starts), so *5 to 12* plays the same notes as before (checked: identical events, and a test that anchor 13.55 at 0 s is 11.55 at 7200 s). `show=sun` draws the day meter as the dial (`SunNode`, which finds the law that reads it); `show=brightness` shades each segment of a mode table by its brightness (`CellGlyph`). In the golden graph `&blues` shows brightness and `&cycle` reads `&day`.

### Built: the readers are the junctions; nets in the forces (2026-10-07)

The owner: with the ratsnest, cells become the junctions and the crossings of the nets they're on (a safe crossing: a meter's net and a scale's meet at a cell and flare out of it); the loom and the strands were mangled by the T-junctions; `&up`'s edges to `&tune` a bus. Built:

- **A net's tree** (`ForceLayout.netTree`): the readers are its junctions, each joined to the one nearest it already joined (Prim's), a join through a wheel costing as much again per wheel. A bus leaves its owner once (to the reader nearest it); a meter's ground joins it wherever is nearest. No T in mid-air: a tap comes on from a reader, out of its wheel (`taps()`, a hop, drawn as a short loom flared over the rim facing the next reader, the strands in the table's order). In the golden graph `&mode`'s net runs `&mode` → `&motif` → `&theme`.
- **The meter's net is in the model**: `GraphModel.nets` holds every net — `over`, `voice` (a melody playing several voices), `mix` (a voice into several mixes: the sound card's channels) and `step` (a meter's ground). `meters.ts: groundsOf` reads the ground from there; the layout no longer works out which edges are ground. A tape's heads are not a net: each is its own place on the tape, which is their junction already. The meter's traces are still laid at rest by `meterNet` (Kruskal, costed by what they cross).
- **The loom, again**: strands on the near half leave at a right angle and come round into the bundle; strands on the far half run straight under the wheel; the places across the bundle are in the order the strands sit across its way, so none cross. A ref written more than once (`&up` in `&tune`) is a bus: a strand to each place.
- **Nets in the forces** (`stepNets`): each join of a net's tree is a spring (a bus's as a part's edge, a meter's as its ground), instead of the owner's star; the tree is laid again every tick. `netClear` (a wheel on a join pushed off it) is built and off: it made it worse; the tree's cost already keeps joins off wheels.
- **The quality gate is the mean of three seeds**: one start is noise (HEAD's 83 crossings was seed 0; its six seeds run 83 to 115).

Measured over the library, mean of six seeds (crossings / cost; golden):

| | crossings | cost | golden |
|---|---|---|---|
| before (HEAD) | 103.3 | 165.2 | 3.7 |
| readers as junctions, no net forces | 95.8 | 146.3 | 4.0 |
| + tree springs, laid every 5 ticks | 82.5 | 129.5 | 4.5 |
| + tree springs, every tick | 82.0 | 128.8 | 4.5 |
| + wheels off the joins (0.3) | 85.7 | 138.3 | 4.5 |
| meter's tree at half pull / buses' only | 98.3 / 101.0 | 152.0 / 151.8 | 5.3 / 4.7 |
| + voice and mix nets | **75.3** | **123.2** | 5.2 |

Over three seeds (the gate): crossings 101 → 76, cost 165 → 123, cells in a foreign cluster 92 → 64, overlapping clusters 42 → 35, read heads' aim 36.6 → 36.0; area 7 % more.

Then a voice's mix net read as if one mix fed the next (`&lead` → `&leadA` → `&leadB` → `&out`). The owner: **sound branches from its owner as a star** (built below).

### Built: sound as a star; meters placed last again (2026-10-07)

- **Sound branches from its owner** (the owner's call): a net whose band is audio (a voice into several mixes) joins each reader to the owner, as before nets; the others (tables, melodies) go on from reader to reader. Over six seeds it costs a little (75 → 80 crossings): the chain was shorter.
- **Meters placed last, again** (the owner, begrudgingly: worth revisiting). `placeMeters` is back as an option (`placeLast`), on: the meter is laid out among its cells by its net's springs, then put where its net costs least and held there. With the nets' springs it pays as it didn't before (six seeds, crossings / cost / area in Mpx²):

| | crossings | cost | area |
|---|---|---|---|
| not placed (the meter among its cells) | 80.2 | 126.7 | 75.9 |
| **placed last** | **63.3** | **90.2** | 74.5 |
| placed last, the meter free while laid out (as before it was retired) | 72.3 | 108.2 | 76.1 |

And it is steady: 62–65 over the six seeds. Over the gate's three seeds: crossings 76 → 63, cost 123 → 87; cells in a foreign cluster 64 → 71 and read heads' aim 36 → 38 (recorded: the trade is worth it).

The miniatures (`node tools/gallery.mjs graphs`, now a gallery subject) draw a net's hops as the graph does. A visual pass over them: the meters now sit among the cells they step, not at the bottom; the large pieces (BWV 847, Cellscape, Baustelle, Hypercell, Zell) are still dense knots with overlapping clusters, and the small ones are clean.

### Tried: laid out by insertion (2026-10-07)

The owner's idea: start with the sound card in the middle and take in the cells one at a time, each next to what it is joined to already, in the order a walk from the drains meets them (the sound card, a scope first); a meter, reached by no drawn edge, comes last of itself. Built as an option (`insert`, the ticks it takes; `startInsertion` in `physics.ts`: while it grows, the forces see only the cells taken in). Measured over the library (crossings / cost; cells in a foreign cluster):

| | crossings | cost | intruders |
|---|---|---|---|
| the layered start (today), six seeds | **63.3** | **90.2** | 68.0 |
| insertion over 150 ticks, six seeds | 109.8 | 177.8 | 51.8 |
| … without the layers' pull | 101.8 | 167.8 | 80.2 |
| … over 60 / 300 ticks, three seeds | 114.3 / 99.3 | 181.7 / 154.7 | 79.7 / 53.3 |
| … each placed close to its neighbours, three seeds | 98.0 | 158.7 | **41.0** |

Worse in nearly every piece, the knots most (Cellscape 15 → 24, Baustelle 11 → 14). The layered start orders each row against the whole graph's crossings; insertion decides greedily, early, and the forces don't undo it (as with growing from small). It gathers the clusters better, though. Off, kept as an option.

### Built: insertion order within the layered rows; both tried (2026-10-07)

The owner: try insertion order within the layered rows. `layered.ts: insertionOrder`: a walk from the top row (the sound card) and the scopes, breadth first along the edges between rows, takes in one node at a time, each into its row where it crosses the fewest edges to the nodes already in (then nearest its neighbours); the sweeps (barycentre, swaps) go on from there (`rowOrder` 1), or not (2). Over six seeds (crossings / cost; intruders):

| | crossings | cost | intruders |
|---|---|---|---|
| sweeps from the columns (before) | 63.3 | 90.2 | 68.0 |
| insertion, then the sweeps | 64.7 | 91.7 | 58.2 |
| insertion alone | 70.3 | 96.8 | 61.8 |
| whichever has fewer crossings in the layered rows | 66.0 | 97.5 | 59.3 |

Even over the library, but not piece by piece: insertion untangles the knots (BWV 847 7.2 → 4.2, Zell 4.2 → 1.7, Baustelle 10.7 → 6.7) and loses Cellscape (15.3 → 23.2). The rows' own crossings don't say which will lay out better; laying each out does. So **both are tried** (`rowOrder` 3, on): a fresh graph is laid out twice for `trial` ticks (120), by each order, and starts from the one that crossed less (`rowOrderFor`).

A bug on the way: the tree's cost for a join through a wheel (`netTree`) clamped before it divided, so it never counted a wheel; fixed (and three times faster, the net force 0.8 → 0.5 ms a tick on Baustelle). With it the sweeps alone come out worse (70.3), both tried better:

| six seeds | crossings | cost | intruders |
|---|---|---|---|
| sweeps only | 70.3 | 103.2 | 66.8 |
| **both tried, 120 ticks** | **46.0** | **64.0** | 60.3 |
| both tried, 60 ticks | 49.3 | 69.5 | 58.5 |

The gate (three seeds): crossings 63 → 45.5, cost 87 → 64, intruders 71 → 60, read heads' aim 38 → 30; overlapping clusters 35 → 36; area the same. The price is time when a piece opens: the two trials (node, `performance.now`, before the faster tree): BWV 847 0.37 → 0.77 s, Baustelle 0.49 → 1.11 s, Cellscape 0.42 → 1.14 s, Twinkle 25 → 85 ms. Edits don't pay it (only a fresh graph). Building the examples' index (their miniatures) takes 8 → 20 s. Not measured in the browser. Then each example's order is chosen when the index is built (`ExampleInfo.rows`, by the graph's shape: `rowsKey`) and the graph is given them (`rowOrders`): an example opens without the trials (Baustelle 0.41 s against 0.40 s with the sweeps alone and 1.01 s with the trials); a piece of one's own, or an example edited out of its shape, still tries both.

### Order

1. The weights table and weighted crossings: measurable against the baseline, no change to the model.
2. Nets in the model (`GraphModel.nets`), with the meter's net computed there instead of in the layout.
3. Nets for tables (one loom, branching), then tapes' heads, voices, the card's channels.
4. The sun: time units, `anchor=` on clocks, `show=sun` and `show=brightness`, *5 to 12* rewritten.

## Open questions

1. **The canon's clean form** (decision 6): a canon is one net, `&john`, with three taps at a delay. As copies today, `&john[<<1]`. Once `&<` exists, as taps of what was played. Which of the two the Frère Jacques example shows is to be decided when `&<` comes.
2. **The net's style** (decision 9): which styles (strands or one line, a pulse or still, coloured or neutral), and the spelling of the attribute and of the decorator.
3. **The time source** (decision 11): its name and attributes, and how a tap names its unit.
4. **The law and the day:** decided, `over=&day` (built).
5. **Junctions in the layout:** decided, the readers are the junctions (built); no node of its own.
