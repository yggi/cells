# 052 · The ladder's variations are operators in cells, from a fragment's text to texts: rotate, drop and add first, then transpose, invert and reverse; anchors derived from the text; which and when stays the frontend's

**Date:** 2026-10-20 · **Status:** accepted (owner, 2026-10-20: "all as suggested", the eight questions in point 6 as recommended) · Issues: #208, #49, #81, #29, #46, yggi/jambot#423, yggi/jambot#424, yggi/jambot#425 · Point 7 added by #293 (accepted, owner, 2026-10-27: `base=` rather than `mask`, "it is more powerful") · Points 8 and 9 added by #208 (owner, 2026-11-23: the two harmony operators with rotate and reverse a level up, the cadence the last bar of each four, a variation replayed by its `by:`) · Point 10 added by #51 (owner, 2026-11-23: forms and song plans, one set of slot operators at every scale, a mask for the anchors) · Point 11 added by #51 (owner, 2026-11-23: references for forms, the mask on melodic lines, the mechanism generalized across scales)

## Context

[Decision 043](043-the-composer-selects.md), point 5, has one ladder of novelty: repeat, **vary with operators**, recombine the workbench, fetch nearby, fetch far.
Jambot climbs it for the drums (yggi/jambot#411, yggi/jambot#414), and its vary rung lives outside cells, in `packages/engine/src/novelty.ts` (yggi/jambot @ 1037a80):

- The composer reads a drum fragment's text into hits (a role, a General MIDI note, a step, a velocity), varies one line of them, states the hits as cells text again (`grooveText`), and files that with `source: composer` and `varies: <id>`, the fragment it varies.
- **`variations`** gives every variation by one operator on one line, for each line in the order the bar first plays them: **rotate** (every hit one step later, the last step wrapping to the first), **drop** (one hit left out, where the bar keeps `GROOVE_FEWEST`, 3), **add** (a hit of the sound the line strikes first, on a step that sound is silent on, at the line's loudest).
  None strikes one sound twice on a step, none is the bar itself or one given before, and a draw picks one of them (`pick(draw, ones)`).
- **The anchors**, `GROOVE_ANCHORS`: the kick and the backbeat carry the meter, and no operator touches them; nor the fill, which the drummer plays its own of.
- Over E31's eight drum bars, cells' seed rhythms (`fixtures/jambot-e31.json`, 144 hits), `variations` gives **284** variations: 18 rotations, 81 drops, 185 adds, from 17 (Ambient) to 49 (Funk) a bar (a lifted copy of it, run over the fixture's hits; a probe, not committed).
  Over E38's runs (40 runs of 3 hours), 141 of the 198 grooves the layer files are the composer's variations: 98 of seed drum bars, 43 of grooves filed (yggi/jambot `docs/language-experiments.md`, E38 and E39).

The next three band members bring operators on pitched lines: the bass transposes by a degree, inverts and reverses, never moving a chord change's root on its downbeat (yggi/jambot#423); the lead's variations (turn over, lift, bend the last note, drop it) become operators (yggi/jambot#424); harmony substitutes a secondary dominant and reharmonises a slot by a third, never the fourth bar's cadence (yggi/jambot#425).
Built in Jambot, each would be one more reading of the text into Jambot's own terms and one more statement back.

The language already holds most of these as forms (`docs/language/braid.md`): `&x^n` moves n degrees of the table a line reads (decision 015), `inverse(&x)` mirrors it, `&x[::-1]` is its retrograde.
Drop and add are the step edits a graph makes (`engine/edit.ts`).
And decision 050's E5 counts "a transposition, `^n`, a rotation" as the same orbit (#46).

## Decision

### 1. The operators live in cells; which one, and when, stays the frontend's

One set of operators, in the language, for both frontends: Jambot's composer varies with them, and Cell studio can offer "vary" on a fragment or a line, as it offers Shorten's suggestions.
What stays in the frontend is the ladder's policy:

- **when** to vary: boredom, the rungs, rejection, the lineage (`familyOf`, `wantsVariation`);
- **which operators** a part may use (the drums the rhythm ones), and which lines it leaves alone for its own reasons (`keep`: Jambot's fill);
- **the draw**, keyed as the frontend keys its randomness (Jambot's `random.ts` streams); cells takes it as an argument and has no randomness of its own;
- **filing** the variation, with its metadata (`fileFragment`, decision 048).

### 2. An operator is a function from a fragment's text to texts

An operator reads a fragment's text on its workbench (the host's `&bar`, `key`, `&harm`: what it is read under, decision 047) and gives **every** variation it can make, each a `Rewrite` (decision 049's shared layer) of a fifth tool, `vary`.
It makes no choice: a frontend picks one by a draw, or shows them all.

| operator | what it does to one line | the language's form it writes out | from |
|---|---|---|---|
| **rotate** | every note one step later on the line's grid, the last wrapping to the first | a rotation in time (E5) | Jambot's rotate |
| **drop** | one note made a rest, where the fragment keeps `fewest` notes (*since #911*: one step, all it strikes, a rest) | a step edit | Jambot's drop |
| **add** | one note of the sound the line strikes first, on a step that sound is silent on, at the level of the line's loudest (*since #911*: a rest given what the line's loudest step strikes, at its level) | a step edit | Jambot's add |
| **transpose** | every note n degrees of the table the line reads (`key`, or the chord in force), n in −2, −1, 1, 2 | `&x^n` (decision 015) | yggi/jambot#423; the lead's lift (n = 2) |
| **invert** | every note mirrored about the line's first note, in degrees of its table | `degree(inverse(&x), 2f)`, f the first note | yggi/jambot#423; the lead's turn over |
| **reverse** | the notes in reverse order, each keeping its length | `&x[::-1]` | yggi/jambot#423 |
| **bend** | the last note moved to the note before it, n degrees of its table from it, n in −2, −1, 1, 2 (`BENDS`) | the note before, `^n`, on the last's step | the lead's bend (yggi/jambot#424, #267) |
| **trim** | the last note left out, the note before it held to the lap's end (a rest after it), where the line keeps 2 notes (`TRIM_FEWEST`) | a step edit | the lead's drop (yggi/jambot#424, #267) |

- **A line** is an entry of a card's mix: a cell, or a product of cells on one grid (`&euclid * &euclidLevel`).
  *Since #291 (2026-10-26)*, a fragment carries no card, so an entry that is a mix of its own (a drum bar's `&groove`) is read as a card is, a mix nothing reads is read as one, and a pitched line nothing reads (a bass line's `&bassline`) is a line with no voice of its own.
- **A held note** (`7@2`, *since #294, 2026-10-27*) is read as one note, its steps long, so a motif that holds its notes varies. Only transpose and invert move it, and it is written back held. Reverse, bend and trim would move where its notes fall and end, so they leave a line with a held note alone.
- **Written into the line itself.** A variation rewrites only the braid of the line it varies, under the same name, as plain steps on the line's own grid; Normalise then spells it. It never writes a reference to its source (`&hat2 base=&hat[>>1]`), because a filed variation stands alone (its source may not be on the workbench), replaces its source in the union (the same name, decision 047's "the same line"), and keeps its anchors, which a whole-line form can't. A form that survives the change is kept: a Euclid rotated is a Euclid with another rotation; one a hit dropped is written out as steps, as `grooveText` does.
- **Not a variation**, and left out: a result that plays the same notes as its source or as a variation given before it (S2, below); one that strikes one sound twice at one onset; one that leaves the fragment fewer than `fewest` notes.
- **The order** was Jambot's, so its draws picked the same variation (until #911, point 11.3, which the owner let change it): the lines in the order the lap first plays them (by onset, then pitch); for each, its rotation, its drops in the order the notes play, its adds by step; then the pitched operators, transpose by −2, −1, 1, 2, invert, reverse, bend by −2, −1, 1, 2, trim.
- **The draw:** `varied(text, draw, options)` gives the variation at index ⌊draw · n⌋ of the n, for a draw in [0, 1), the index Jambot's `pick(draw, ones)` gives for every draw; a draw outside [0, 1) is an error.

A drum bar on its workbench, and three of its 17 variations (1 rotation, 4 drops, 12 adds); the comment names each as the frontmatter will (point 4):

```cells
# source: a drum bar, the host's meter first
&bar meter("4/4") step=120bpm

&kick note=36 step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd note=36 s=white
&sd note=38 s=white
&hh note=42 s=white
```

```cells
# by: rotate &hat
&bar meter("4/4") step=120bpm

&kick note=36 step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd note=36 s=white
&sd note=38 s=white
&hh note=42 s=white
```

```cells
# by: drop &hat 6
&bar meter("4/4") step=120bpm

&kick note=36 step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n ~ ~ &hh:0:.25 ~ ~ ~ ~ ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd note=36 s=white
&sd note=38 s=white
&hh note=42 s=white
```

```cells
# by: add &hat 0
&bar meter("4/4") step=120bpm

&kick note=36 step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n &hh:0:.5 ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd note=36 s=white
&sd note=38 s=white
&hh note=42 s=white
```

A bass line over the chord in force on its workbench, and three of its 10 variations (4 transpositions, an inversion, a retrograde, 3 bends and a trim: its bend by −1 plays its source); its anchors are the roots on steps 0 and 4, where the chord changes:

```cells
# source: a bass over the chord in force, the host's meter, key and harmony first
&bar meter("4/4") step=120bpm
&key scale(minor, A)
&harm over=&key step=2n [0,2,4] [3,5,7]

&bass over=&harm step=8n 0 ~ 1 2 0 ~ 2 1
&low s=tri loop=C2
&mix map=sample [&bass * &low]
```

```cells
# by: transpose &bass 1
&bar meter("4/4") step=120bpm
&key scale(minor, A)
&harm over=&key step=2n [0,2,4] [3,5,7]

&bass over=&harm step=8n 0 ~ 2 3 0 ~ 3 2
&low s=tri loop=C2
&mix map=sample [&bass * &low]
```

```cells
# by: invert &bass
&bar meter("4/4") step=120bpm
&key scale(minor, A)
&harm over=&key step=2n [0,2,4] [3,5,7]

&bass over=&harm step=8n 0 ~ -1 -2 0 ~ -2 -1
&low s=tri loop=C2
&mix map=sample [&bass * &low]
```

```cells
# by: reverse &bass
&bar meter("4/4") step=120bpm
&key scale(minor, A)
&harm over=&key step=2n [0,2,4] [3,5,7]

&bass over=&harm step=8n 0 2 1 ~ 0 1 2 ~
&low s=tri loop=C2
&mix map=sample [&bass * &low]
```

`src/engine/vary.test.ts` holds what these claim: each compiles, plays other notes than its source and than the others, keeps its anchors and its holes, changes only the line it names, and does to it what its operator says.

The API, a sketch for judging, nothing built:

```ts
// src/engine/vary/: the tool `vary`, beside shorten/ and normalise/, exported as @yggi/cells/engine/vary.
import type { Rewrite } from '../rewrite';

/** The operators: rhythm (rung 1), pitched (rung 2). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse';

/** One change to one line: a Rewrite of the tool `vary`, whose `apply` gives the varied fragment. */
export interface Variation extends Rewrite<Operator> {
  /** The line it varies, as written: `&hat`. */
  readonly line: string;
  /** For the frontmatter's `by:`: the operator, the line and its amount, `drop &hat 6`, `transpose &bass -1`. */
  readonly by: string;
}

/** The frontend's policy: cells knows none of it. */
export interface VaryOptions {
  /** The text the fragment is read under (the host's `&bar`, `key`, `&harm`): its meter and harmony set the anchors. */
  readonly workbench?: string;
  /** Which operators, in this order; by default the rhythm ones. */
  readonly operators?: readonly Operator[];
  /** Lines left alone for the frontend's own reasons, beside the anchors (Jambot: `&fill`). */
  readonly keep?: readonly string[];
  /** The fewest notes the fragment keeps over its lap (Jambot: 3, `GROOVE_FEWEST`); by default 1. */
  readonly fewest?: number;
  /** Transposition's amounts, in degrees of the table read; by default −2, −1, 1, 2. */
  readonly degrees?: readonly number[];
}

/** What no operator moves: a whole line, or one note of it (its step on the line's grid). */
export interface Anchor {
  readonly line: string;
  readonly step?: number;
  readonly reason: 'kick' | 'backbeat' | 'root' | 'cadence';
}

/** A fragment's anchors on its workbench, derived from the text (point 3). */
export declare function anchorsOf(fragment: string, workbench?: string): readonly Anchor[];

/** Every variation by one operator on one line, in Jambot's order, none playing the notes of its source or of one before it. */
export declare function variations(fragment: string, options?: VaryOptions): readonly Variation[];

/** The variation at ⌊draw · n⌋, for a draw in [0, 1) (Jambot's `pick(draw, ones)`); null where there is none. */
export declare function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null;
```

### 3. Anchors are derived from the text on its workbench, never declared

What an operator must not touch is read off the fragment's text and the workbench it is read on, by rules in cells, one per facet's kind of line:

- **The kick:** a line every note of which strikes the kick drum: General MIDI's 36, the note a MIDI card sends for it (`gmDrumNote`: `bd`, `kick`, `kd`).
- **The backbeat:** a line every note of which strikes the snare (38: `sd`, `snare`) on the meter's backbeat: its odd pulses, and in a bar of 2 or 3 pulses every pulse after the first (Jambot's `backbeatOf`, lifted).
- **The root on a chord change:** a note whose onset is where the chord in force (`&harm`, a braid of stacks, #95) changes or its lap starts, and which plays that chord's root (index 0, or a lap of it).
- **The cadence:** the entry of a progression in force in the last bar of its lap (rung 3 settles its place).

An anchored line is never varied; an anchored note keeps its place and its pitch, and the operators act around it: rotate and reverse within each span between two anchored notes, transpose and invert on every other note.
A frontend's `keep` names lines it leaves alone for its own reasons (the drummer plays its own fill): that is policy, an argument, never written in the file.

Measured: on each of E31's eight drum bars, the kick and backbeat rules find exactly `&kick` and `&backbeat`, Jambot's `GROOVE_ANCHORS` (8 of 8; the same probe).

Why derived:

- **Decision 047's rule:** what a fragment needs is derived from its text, never written beside it, so the check can't drift from the language. An anchor is such a need.
- **Every text has them.** A groove the Muse files and a variation the composer makes are written by a program, with no hand-written frontmatter; derived, their anchors come with the text, and a variation of a variation keeps them.
- **Names are words** (decision 037): a union renames a colliding name (047, point 2) and E2 renames freely; a rule that reads what a line plays survives both.

**Why not** frontmatter (`anchors: [kick, backbeat]`): a name the union renames goes stale, a filed groove has none, and two statements of one constraint drift.
**Why not** by name (`&kick` is the kick): it holds for Jambot's lines, which its reading names by role (`roleOfSound`), and for no other text; the rules above are that reading, in the language.

### 4. What a variation is, by the equalities

- **It plays other notes:** S2-distinct (decision 050) from its source and from every variation given before it, by construction (the notes its steps write are compared as they are written; nothing is compiled per variation).
  So it is E3- and E4-distinct too, since each of those implies S1 and S1 implies S2: a new fragment by every text rung the repository reads (E2 today, E4 at the hash).
- **Its anchors play as before:** S3 (`sameNotes`) over its anchored lines, and each anchored note at its step with its pitch.
- **Its holes are its source's:** what it uses, defines, and its clock needs (`holesOf`), so it fits every workbench its source fits.
- **The orbit:** rotate, transpose, invert and reverse of a line with no anchored note inside it keep the line in its source's orbit (E5, #46); drop and add leave it.
- **Recorded in the frontmatter**, two of decision 047's open keys: `varies: <id>`, the fragment it varies (Jambot's key today), and `by: <operator> <line> [<amount>]` (`by: drop &hat 6`), what was done to it, which `Variation.by` carries for the frontend to file. cells writes neither on its own; a lineage reads `varies` alone.

### 5. Bounds a later implementation is held to, and its rungs

**Rung 1, the rhythm operators** (rotate, drop, add, the kick and backbeat anchors, `keep`, `fewest`, `varied`), first, so Jambot can switch:

- **Jambot reproduced exactly** (until #911, point 11.3; now 277 of the 284, 259 in the same place): on E31's eight drum bars, cells' `variations` with `keep: ['&fill']` and `fewest: 3` gives as many as Jambot's `variations` (284), in the same order, each read back by Jambot's reader (`readRhythm`) as the hits Jambot's gives (role, note, step, velocity).
  The same over every groove E38's runs file (198 in 40 runs), and each of its 141 variations is the one `varied` gives for the draw Jambot drew (measured in Jambot's tree, at its switch).
- **The draw:** `varied` takes the index `pick(draw, ones)` takes, over 10,000 draws evenly spaced in [0, 1) on each of the eight bars.
- **The anchors:** `anchorsOf` gives `&kick` and `&backbeat` on 8 of 8 E31 bars; the lifted backbeat rule equals Jambot's `backbeatOf` on each of the seed library's 13 meters.
- **Never an anchor moved:** for every variation of the eight bars, `sameNotes(source, variation, anchored)`.
- **Other notes:** no variation plays the notes of its source or of another variation of it (0 of 284 do in Jambot's today, by the probe); each one's holes are its source's.
- **Speed:** every variation of one E31 bar on its workbench in under 50 ms (Funk's 49), Jambot's warm-up slice (yggi/jambot#412); `varied` under 5 ms beyond its source's compile, Jambot's ask (yggi/jambot#408). Here Funk's bar compiles in about 2 ms, and one S2 check takes about 14 ms, so the tests check S2 and the tool never does.

**Rung 2, the pitched operators** (transpose, invert, reverse, the root anchor), for yggi/jambot#423, once its five bass seeds are files in cells:

- On each of the five seeds, on its own workbench: every variation plays other notes than its source and the others; the root on each chord change plays as before; every other note plays what the language's own form plays: `&x^n` for each n, `degree(inverse(&x), 2f)`, the retrograde within each span. Up to 30 variations (5 × 6); the pull request names any left out, and why.
- The lead's (yggi/jambot#424) map onto these: lift is transpose by 2 and turn over is invert, each reproducing the first two ways of the lead's `varied` (before its nudge) note for note on its shapes, in Jambot's tree; bending the last note and dropping it (the note before held to the bar's end) join as operators of their own when that rung starts: **bend** and **trim** (#267), pitched operators after reverse. The lead's drop is `trim`, not a pitched `drop`: an operator's name acts on one kind of line, and `drop`, a rhythm operator a frontend gets where it names none, would then leave the last note of a pitched line out for a frontend that asked only for the rhythm ones.

**Rung 3, harmony** (yggi/jambot#425): substitution by a secondary dominant toward a slot and a slot reharmonised by a third, with the cadence as their anchor, specified with numbers when yggi/jambot#425's seed progressions are files. *Since #208 (2026-11-23):* point 8.

No rung changes how any piece sounds: no snapshot moves, and nothing of #29 is needed (every operator writes forms the language has).

### 6. Settled with the owner (2026-10-20: all eight as recommended)

1. **The operators in cells, one set for both frontends?** Ruled, as recommended: yes, as above; the policy (when, which, the draw, `keep`) stays the frontend's.
2. **Anchors derived from the text, or declared in frontmatter?** Ruled, as recommended: derived (point 3), with the frontend's `keep` for its own reasons.
3. **The backbeat rule lifted now, or written by the meter's accents (#21)?** Ruled, as recommended: lifted now from Jambot's `backbeatOf`, as a function of the meter's pulses; when a meter can say its accents, the rule reads them instead.
4. **A rotation that only moves levels** (a line one sound strikes on every step): S1-distinct, S2-identical. Ruled, as recommended: not a variation, as point 2 says; none occurs on E31's bars, so Jambot is still reproduced exactly.
5. **`by:` beside `varies:`?** Ruled, as recommended: yes, a string `Variation.by` carries and the frontend files; nothing reads it but people and, later, the hash (6).
6. **A variation in its source's orbit (rotate, transpose, invert, reverse): its own text, or a reference to its source with the operator** (#49's requirement 1, `fragment(h)^5`)? Ruled, as recommended: its own text now, since references wait for the hash; `varies` and `by` keep what a reference would need.
7. **The pitched operators' amounts:** transpose by −2, −1, 1, 2 degrees of the table read; invert about the line's first note; reverse within each span between anchors (the whole lap where there is none). Ruled, as recommended: these, each a default the frontend may narrow (`degrees`, `operators`).
8. **Where it lives:** `src/engine/vary/`, a fifth tool beside Shorten and Normalise sharing their `Rewrite` (`Tool` gains `vary`), its promise "other notes, anchors kept" where theirs is S1; never run by `rewriteAll`. Ruled, as recommended: yes.

### 7. A variation's reference, beside its text (#293)

Point 6.6 kept a variation's own text, and the path only in `by:`; a text that plays the variation then loses what was varied. Each variation now also carries its **reference**, `Variation.reference`: the varied line as a form on the line it varies, in the forms the language already has, and a cell that plays it (`reference.line(name)`), to read where the line was read. The text stays what is filed (6.6 holds); the reference is what a text that keeps its source writes instead (Jambot's section text by reference, yggi/jambot#498).

| operator | its reference | where it has none |
|---|---|---|
| rotate | `&x[<<]`, a pick, which a mix reads as an entry (`[&kick, &hat[<<]]`) | a line ending on a run (`~!7`, which a turn of one step would split), a Euclid |
| transpose | `&x^n`; with an anchored note, `base=&x^n` and the anchored notes written (`base=&bassline^-1 0`) | where it is longer than the line written out (`0 0`) |
| invert | `inverse(&x)`, `degree(inverse(&x), 2f)` about a first note f; with an anchored note it moves, the picks around it mirrored | as transpose |
| reverse | `&x[::-1]`; with anchors, each span between two read backwards (`&x[0] &x[:0:-1]`) | as transpose |
| drop, add, trim, bend | `base=` (decision 026), the copy changed on the one step it changes: `base=&hat =!6 ~`, `base=&hat =!3 &hh:0:.4`, `base=&bassline =!14 &bassNext^1` | a line with a cell of levels, a Euclid |

- **Asked (#293, 2): a form for drop, add, bend and trim.** None new: `base=`, a copy changed where it says, is each of them already, and keeps anchors and runs (`=!5` keeps five steps of a run). Strudel's `mask` (decision 027) would write a drop alone, as a second line of rests and ones beside the line, and nothing for an add or a bend.
- **A line of hits is referred to by a pick or by `base=`, never by a braid of its slices:** a cell that splices one has no voice (`&r step=16n &hat[:4] ~ &hat[5:]` is an error), so a slice of a drum line can't play. A pitched line's slices play.
- **Point 2's "why not" answered in part:** a reference keeps an anchor inside a line (`base=&x^n` and the anchor written), and stands beside its source, not alone: the layer still files the text.
- **Measured** (`src/engine/vary/reference.test.ts`): over the 14 seed rhythms (Jambot's options) and the 5 bass lines on both of their workbenches, Vary gives 535 variations, **472 with a reference**; every one plays the notes of its variation (S2) read where the line was, and each is no longer than the line written out by `bare`, 470 shorter. Of the four operators that had a form before (rotate, transpose, invert, reverse), 63 of 73. None is given on the Euclid lines (their 33 adds and drops, 3 rotations), the claves' rotations (5, a last run), and 22 more where the line written out is no longer. Reading a reference costs no compile.
- **Recognition** (decision 055) reads a reference as its path, with no search: a heard text that uses a fragment (`use &hats from "Electro swing drums"`) and writes one of its variations' forms on a line it takes (`&hats2 base=&hats =!3 ~`, an entry `&hats[<<]`, `&late step=8n &gypsy^-2`) is that fragment by that operator, at distance 0, with no compile of the heard text.


### 8. A progression is a line one level up (rung 3, #208)

A progression is varied as a line is, a level up (#51, one shape at every level): its steps are chords where a line's are notes, its cadence is its anchor where a bass line's is the root on a chord change. `src/engine/vary/progression.ts`.

- **A progression** is a harmony the fragment defines itself: a cell no line plays, stepped on the meter, each step a stack of degrees of the table it reads, a run written `!n`, or a step's two halves (`[[1,3,5] [4,6#,8]]`), each tone a degree with at most one accidental: every seed progression (17 of 17) and what Jambot's `progressionText` writes. One written otherwise is not read, and not varied.
- **Its cadence:** every step that sounds in the last bar of a four-bar phrase (bars 4, 8, 12 … of a lap of 4k bars), else in the lap's last bar (`PHRASE_BARS`, 4). It is an anchor, `reason: 'cadence'`, and `anchorsOf` gives it. This settles point 3's "rung 3 settles its place", as yggi/jambot#425 asks: "never the cadence in the fourth bar".
- **Six operators** (`HARMONY_OPERATORS`), in this order (swap and substitute, the slot operators every level shares, joined with point 10):

| operator | what it does to a progression | `by:` |
|---|---|---|
| **rotate** | each phrase between two cadences a step later, its last chord to its first (a line's rotate) | `rotate &harm` |
| **reverse** | each phrase between two cadences in reverse order (a line's retrograde, `&x[::-1]` a span) | `reverse &harm` |
| **third** | one step's chord moved a third, every tone n degrees, n in −2, 2 (`THIRDS`): I to vi or iii | `third &harm <step> <n>` |
| **dominant** | the secondary dominant of the next step's chord on a step's second half: a major triad a fifth above that chord's root (a dominant seventh where it has four tones or more), each tone the stack's degree with the accidental the key needs, in the octave nearest the chord before it (Jambot's `themes.ts` at high harmony) | `dominant &harm <step>` |
| **swap** | two adjacent free chords exchanged (point 10) | `swap &harm <step>` |
| **substitute** | one free chord replaced by another chord the progression holds, each once (point 10) | `substitute &harm <step> <from>` |

- `third` and `dominant` act on a step of one chord; `dominant` gives none into a chord on the step's own root, into a diminished triad, or after a chord already its dominant (a ii–V–I has none: Jambot's `alreadyItsDominant`).
- **Asked by name:** a progression is varied only where a frontend asks for `third`, `dominant`, `swap` or `substitute`; `rotate` and `reverse` then act on it too, so a frontend that asks for the line operators alone (Jambot's drums, bass and lead, Cell studio's default) gets what it got before, to the variation.
- **The key spells it:** a dominant's accidentals are read from the workbench's key (`&key scale(minor, C)`: V/VI is E♭ major, the key's own III), so a frontend varies a progression on the key it plays it in.
- **Other chords:** each plays other chords than its source and every one before it (S2, the chords keyed as they sound: onset, length, tones sorted); its cadence plays as before.
- **Its reference** (point 7): a copy of the progression, `base=`, changed on the steps the variation changes (`base=&harm =!2 [1,3,5]`, `base=&harm [[0,2,4] [2,4#,6]]`), `=!k` keeping k steps; a cell that plays it reads the progression's table and grid. Each of the seed progressions' 789 variations has one, and plays what its variation plays, read beside its source. The text is still what is filed.
- **Heard:** recognition's default, `ALL_OPERATORS`, holds `third` and `dominant` beside the line operators, so a heard progression is known as a seed's variation by its `by:` (decision 055); asked for `HARMONY_OPERATORS`, each of the 789 at distance 0 but one, the montuno's third bar given its second's chord, which is the vamp to the fourth, a seed, and recognised as it.
- **Measured** (`src/engine/vary/harmony.test.ts`): on the 17 seed progressions over 4/4 and C, **394 variations in major and 395 in minor** (209 and 210 before swap and substitute joined): 332 thirds, 316 substitutions, 54 swaps, 24 rotations, 18 retrogrades, 45 dominants; a vamp of one or two chords by its thirds and substitutions alone. Each compiles, plays other chords than its source and the others, keeps its cadence's chords, and does what its operator says; each seed's variations, its compile included, in under 4 ms (the test's bound 10 ms; #425's ask is under 5 ms beyond the compile).

A progression and three of its 11 variations, on its workbench; the fourth bar, V, is its cadence:

```cells
# source: I vi IV V, a bar each, the host's meter and key first
&bar meter("4/4") step=120bpm
&key scale(major, C)
&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]
```

```cells
# by: rotate &harm
&bar meter("4/4") step=120bpm
&key scale(major, C)
&harm over=&key step=1m cycle=4 [3,5,7] [0,2,4] [5,7,9] [4,6,8]
```

```cells
# by: third &harm 2 -2
&bar meter("4/4") step=120bpm
&key scale(major, C)
&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [1,3,5] [4,6,8]
```

```cells
# by: dominant &harm 0
&bar meter("4/4") step=120bpm
&key scale(major, C)
&harm over=&key step=1m cycle=4 [[0,2,4] [2,4#,6]] [5,7,9] [3,5,7] [4,6,8]
```

### 9. A variation replayed by its `by:` (#208)

A filed variation records its origin as `varies: <id>` and `by: <operator> <line> [<amount> …]` (point 4). **`variationBy(text, by, options)`** gives back the one variation a `by:` names, made on its source's text with the options it was made under (the workbench, `keep`, `fewest`, `degrees`, `resolve`), without making the others: only that line's variations by that operator are made. So a frontend that keeps `varies`, `by` and the workbench rebuilds the variation's text from its source, and a lineage is a path it can replay, step by step, from a seed.

- **Why:** Jambot stores a groove variation by its source and `by` and rebuilds it by making every variation and finding the one of that `by` (`rebuiltGroove`, yggi/jambot#553); with a third part (harmony) and a fourth (Cell studio's vary) that would be written again for each.
- **The same variation:** for every `by` that `variations` gives, `variationBy` gives that variation (its `after` the same; tested over every seed progression in both keys and a groove). A `by:` the text has none of (its line anchored or kept, its step a cadence, an unknown operator) gives null. One that `variations` leaves out as playing the notes of a variation before it, by another operator or line, is still given: `variationBy` doesn't make those.
- **Its amounts** are the variation's, as `by:` writes them: a step (`drop &hat 6`), degrees (`transpose &bass -1`), or both (`third &harm 2 -2`).
- **The lineage, in the language** (`src/repository/lineage.ts`): `variationMeta(varies, variation)` writes the two keys a variation is filed with; `originOf(layer, id)` reads them back; `ancestry(layer, id)` is the chain of `varies` from a filing to its root, each step with the `by:` that made it, so a lineage replays from its seed, step by step, by `variationBy`; `rootOf` and `familyOf`, the root and every filing descended from it, the family a frontend's ladder tires of (Jambot's `familyOf`). A chain that comes round to an id already on it ends there.


### 10. A form is a line two levels up; one set of slot operators at every scale (#51)

A form's letters (`&chorus step=8n &a &a &b &a`, `fragments/forms/`) and a song plan's sections (`&verseChorus &intro &verse &chorus …`, `fragments/songs/`) are lines of slots, as a progression's chords are, and are varied by the same functions (`src/engine/vary/slots.ts`): the owner, 2026-11-23, "keeping it as analogous as reasonably possible, ideally the same functions work on different scales", with a mask that fixes the anchors.

- **A form** (`src/engine/vary/form.ts`) is a cell of the fragment's own that no line plays, with no voice, every step a splice of another cell (`&a`, `&a^3`, `inverse(&call)`, `&call[::-1]`), two or more. Two forms of as many slots that pair one to one (a song plan and its plan of who plays, `&intro` always beside `&introPlays`) are one form, varied by the first, the other carried slot for slot.
- **The slot operators** (`SLOT_OPERATORS`, `FORM_OPERATORS`), each giving where every slot of a variation is taken from, never moving a fixed slot:

| operator | what it does to a line of slots | `by:` |
|---|---|---|
| **rotate** | each span between two fixed slots one slot later, its last to its first | `rotate &chorus` |
| **reverse** | each span between two fixed slots in reverse order | `reverse &chorus` |
| **swap** | two adjacent free slots exchanged | `swap &verseChorus <slot>` |
| **substitute** | one free slot given what another slot plays, each different one once, by its first place | `substitute &chorus <slot> <from>` |

- **Anchors:** a form's first and last slot (its statement and its return, a song's intro and outro); a progression's cadence (point 8). **A mask** replaces them at any scale: `VaryOptions.fixed`, by line, `{ '&chorus': [] }` none, `{ '&harm': [0, -1] }` a progression's first and last bar as a form's, a negative counting from the end. `anchorsOf` gives the level's own.
- **Asked by name:** a form is varied only where a frontend asks for `swap` or `substitute`, as a progression where it asks for one of the slot levels' own, after every line and progression; a frontend that asks for the line operators alone gets what it got before.
- **Other notes:** two slots are one where they play alike: a form on a grid has each distinct slot spliced alone in one compile beside the fragment (the rounded binary's `&bridge^1` and `&close` are both `&call^-2`); a song plan's slots splice values `flatten` doesn't read as played (a section's intensity, `[&song + -.3]`), so they are one where they are written alike.
- **Only the fragment's own lines are varied**, at every level: a workbench's lines (a motif a form takes, the host's bass) are what it is read on. Before this, a pitched line of the workbench was offered too; no seed's variations change.
- **Its reference** (point 7, since point 11): a copy of the form changed on the slots it changes, `base=&chorus = &b`, and a song plan's partner beside it, `Reference.partner` (`base=&verseChorusPlays = &chorusPlays &versePlays`); one function with a progression's, `slotReference`.
- **Measured** (`src/engine/vary/form.test.ts`): on the 6 seed forms (over two motifs that differ in every note) and the 7 seed song plans, **186 variations**: 42 of the forms (a form of two letters has none: both are anchors) and 144 of the songs. Each compiles, splices other slots than its source and the others (a form's plays other notes), keeps its first and last slot, carries its partner, does what its operator says, and is given back by its `by:`; each fragment in under 15 ms.

A form and two of its three variations, on a workbench that gives its motif:

```cells
# source: AABA, its motif the host's
&bar meter("4/4") step=120bpm
&key scale(major, C)
&a over=&key step=8n 0 2 4 2
&mix map=sample [&chorus * &tri]
&tri s=tri

&chorus step=8n &a &a &b &a
&b step=8n &a^3
```

```cells
# by: rotate &chorus
&bar meter("4/4") step=120bpm
&key scale(major, C)
&a over=&key step=8n 0 2 4 2
&mix map=sample [&chorus * &tri]
&tri s=tri

&chorus step=8n &a &b &a &a
&b step=8n &a^3
```

```cells
# by: substitute &chorus 1 2
&bar meter("4/4") step=120bpm
&key scale(major, C)
&a over=&key step=8n 0 2 4 2
&mix map=sample [&chorus * &tri]
&tri s=tri

&chorus step=8n &a &b &b &a
&b step=8n &a^3
```


### 11. A line's steps are slots: one mechanism from the step to the song (#51)

Point 10 gave a progression, a form and a song plan one set of slot operators. Point 11 takes the same functions down to a line: its steps, rests among them, are its slots.

- **The mask reaches lines** (`VaryOptions.fixed`, by line, steps of its grid): on a pitched line it fixes its steps in place of the roots point 3 derives (`{ '&bass': [] }` frees them, `{ bass: [0, -1] }` fixes a form's anchors on a line); on a line of hits it frees a whole-line anchor (the kick, the backbeat) but for the steps it fixes, around which drop, add and rotate act. With no mask nothing changes: Jambot's 284 are reproduced as before.
- **One rotate, one reverse:** a line of hits' `rotate` and a pitched line's `reverse` are `slots.ts`'s, on the line's steps, within the spans between its fixed steps (with none fixed, every hit a step later, a Euclid still turned). `reversed`, the pitched reverse's own copy of the spans, is gone.
- **`swap` and `substitute` on every line,** where a frontend asks for them: two adjacent steps exchanged, a note or a rest moved with its step (`swap &bass 2`: `0 ~ 1 2` → `0 ~ 2 1`); a step given another step's note or rest (`substitute &bass 7 0`), never a fixed step, never a held note's line. On the seeds' lines (the rhythms, and the bass lines over both harmonies): 1,230, 1,067 with a reference (`base=&bass =!2 2 1`), each of which plays its variation (all 1,067 checked once; the test plays every fifth).
- **References at every scale:** a line's (point 7), a progression's and a form's are each a copy changed where it changes.
- **Heard at every scale,** where a frontend asks recognition for them (since #911 its default doesn't hold them: tried on every line of every fragment they doubled a recognition's cost, past `timing.slow.test.ts`'s ceiling on CI); so asked, on E31's bars Bossa nova's hat added beside step 4 is also Lo-fi hip hop's moved there (`swap &hat 3`), found first by the library's order at the same distance.

**What a frontend sees:** nothing it doesn't ask for. Jambot names its operators and gets what it got.

**Further generalization, measured here and not built** (each a follow-up, named so the next rung can start from it):

1. **Anchors as fixed steps everywhere** (built, #909). A whole-line anchor (the kick) is every step fixed, a root a step, a cadence a bar's steps, a form's first and last slot, a kept line every step: one lookup, `fixedLookup`, answers every level, and **`fixedStepsOf(text, options)`** gives them in the mask's own shape. Handed back as the mask, it varies each of the 97 seeds of every level (rhythms, bass lines over both harmonies, progressions, forms, song plans) exactly as no mask does, variation for variation. `anchorsOf` is unchanged: its reasons stay a frontend's to read.
2. **A per-slot transpose** (built, #910): **`shift`** (`SHIFT`), one slot moved n degrees of its table, n each of `degrees` (−2, −1, 1, 2), around the fixed slots: a pitched line's note (`shift &bass 2 1`: `0 ~ 1 2` → `0 ~ 2 2`), a progression's chord (its `third` is its shift by ±2, the same text for every third of the 17 seeds), a form's letter on a grid (a sequence, `shift &chorus 1 2`: `&a &a^2 &b &a`, its reference `base=&chorus = &a^2`). Asked by name: no level's list holds it, so no count pinned before moves; recognition's default doesn't, as it doesn't swap and substitute. Measured: 504 on the bass seeds over both harmonies (each with a reference that plays it), 332 on the progressions in C major alone (130 beside the harmony operators, whose thirds are its ±2), 52 on the forms, none on the song plans (their slots are values, not on a grid). A lead's `bend` is not a shift: it moves the last note to a degree measured from the note before it, not by its own amount, and stays its own operator.
3. **drop and add as substitutions** (built, #911; the owner, 2026-11-23: "clean solution, order can change, fallout accepted, no migration needed before 1.0.0, hard switch"). They are slot operators on a line's steps, through `slotMoves` with an empty slot (a step that strikes nothing): `drop &x i` leaves free step i a rest, all it strikes; `add &x i` gives free rest i what the line's loudest step strikes, at its level (the first loudest by step). `fewest` and the line's own anchors and mask hold as before; the `by:` strings are kept. Two readings change, the step being the slot: a step that strikes two drums together is dropped whole, never one of the two; and an add fills only a step the line leaves empty, never one another of its drums strikes, with the loudest step's drum, not the first struck. Measured on E31's eight bars: **277**, Jambot's 284 but the 7 that put a closed hat on a step its open hat strikes (Techno's 4, Funk's 3), every one of the 277 among Jambot's as hits, 259 in the same place (Funk's order moves). On the seeds' lines: 351 adds (362 before), 291 with a reference. Recognition: of E45's three-hour walk, five bars a groove of the library with one of the two hats on a step left out are no longer found by that drop.
4. **A split** (built, #912): **`split`** (`SPLIT`), one free slot split in two halves, the second filled by the level's rule, asked by name. A pitched line's note and its neighbour a degree below or above (`NEIGHBOURS`, −1, 1), an ornament: `split &bass 2 1` writes `0 ~ 1 2` as `0 ~ [1 2] 2`, its reference `base=&bass =!2 [1 2]`. A progression's chord and the next chord's secondary dominant: its `dominant` is this split, the same text for every one of the 17 seeds' in C major and minor (45). A form's letter on a grid and each other letter the form holds: `split &chorus 1 2` writes `&a &a &b &a` as `&a [&a &b] &b &a`. The line reader reads a step in halves (`[0 1]`, `[0 ~]`) and writes it back, so a split line is varied again: by its pitch and by whole steps, not split, bent or trimmed again. Measured: 236 on the bass seeds over both harmonies, none on a root, each with a reference that plays it; 32 on the seed forms; none on the song plans (no grid).
5. **One S2 key per slot.** A line's notes, a progression's chords and a form's played slots are keyed three ways; each is a slot's content as it sounds, and could be one function of the level.

## Why

- **One set, two frontends.** Jambot's drums, bass, lead and harmony, and Cell studio's "vary", each wanting operators on the same text, would otherwise write them two or four times, each reading the text into its own terms and stating it back (`grooveText`); in the language they read and write cells text directly, and a variation is a text the repository files as it is.
- **The language already has them.** Transpose, invert and reverse are `^n`, `inverse()` and `[::-1]`; drop and add are the graph's step edits. An operator writes out what the language means, so its result can be checked against the language's own form, and the orbit (E5) counts the same ones.
- **No randomness in cells** (decision 031 keys chance in a piece on its seed, cell, lap and step; a choice of variation is the frontend's): enumerating every variation and taking the draw as an argument makes the result a function of the text and the draw, so two frontends, or a forecast and the band, pick alike.
- **Rhythm first:** Jambot's operators exist and are measured (284 on E31, 141 filed over E38), so the first rung is a move with an exact bound, after which Jambot's `variations`, `variedGroove` and the restatement of variations go; the pitched rung has yggi/jambot#423's seeds to be measured on.

**Why not** operators in Jambot only: the bass, lead and harmony would add three readings of the text in Jambot's terms, Cell studio would have none, and a variation would be filed as Jambot's statement of hits rather than as the text varied.
**Why not** a variation as a reference to its source (`base=`, `&x[>>1]`): it can't stand alone in the layer, can't keep an anchor inside a line, and adds a line beside its source instead of replacing it.

## Consequences

- Jambot (at rung 1): `variations` and `variedGroove` call cells' over the fragment's text; `GROOVE_ANCHORS` becomes what `anchorsOf` derives; `UNVARIED`'s fill becomes `keep`; `GROOVE_FEWEST` is `fewest`; filing passes `varies` and `by` as `meta`.
- Cell studio can list a line's variations as it lists Shorten's suggestions (a `Rewrite` has a title, a before and an after).
- Decision 049's table gains a fifth tool, Vary, which promises other notes where the four promise the same ones.
