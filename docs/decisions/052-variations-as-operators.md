# 052 · The ladder's variations are operators in cells, from a fragment's text to texts: rotate, drop and add first, then transpose, invert and reverse; anchors derived from the text; which and when stays the frontend's

**Date:** 2026-10-20 · **Status:** accepted (owner, 2026-10-20: "all as suggested", the eight questions in point 6 as recommended) · Issues: #208, #49, #81, #29, #46, yggi/jambot#423, yggi/jambot#424, yggi/jambot#425

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
| **drop** | one note made a rest, where the fragment keeps `fewest` notes | a step edit | Jambot's drop |
| **add** | one note of the sound the line strikes first, on a step that sound is silent on, at the level of the line's loudest | a step edit | Jambot's add |
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
- **The order** is Jambot's, so its draws pick the same variation: the lines in the order the lap first plays them (by onset, then pitch); for each, its rotation, its drops in the order the notes play, its adds by step; then the pitched operators, transpose by −2, −1, 1, 2, invert, reverse, bend by −2, −1, 1, 2, trim.
- **The draw:** `varied(text, draw, options)` gives the variation at index ⌊draw · n⌋ of the n, for a draw in [0, 1), the index Jambot's `pick(draw, ones)` gives for every draw; a draw outside [0, 1) is an error.

A drum bar on its workbench, and three of its 17 variations (1 rotation, 4 drops, 12 adds); the comment names each as the frontmatter will (point 4):

```cells
# source: a drum bar, the host's meter first
&bar meter("4/4") step=120bpm

&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd s=white
&sd s=white
&hh s=white
```

```cells
# by: rotate &hat
&bar meter("4/4") step=120bpm

&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd s=white
&sd s=white
&hh s=white
```

```cells
# by: drop &hat 6
&bar meter("4/4") step=120bpm

&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n ~ ~ &hh:0:.25 ~ ~ ~ ~ ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd s=white
&sd s=white
&hh s=white
```

```cells
# by: add &hat 0
&bar meter("4/4") step=120bpm

&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n &hh:0:.5 ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~
&drums map=midi(10) [&kick, &backbeat, &hat]
&bd s=white
&sd s=white
&hh s=white
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

- **Jambot reproduced exactly:** on E31's eight drum bars, cells' `variations` with `keep: ['&fill']` and `fewest: 3` gives as many as Jambot's `variations` (284), in the same order, each read back by Jambot's reader (`readRhythm`) as the hits Jambot's gives (role, note, step, velocity).
  The same over every groove E38's runs file (198 in 40 runs), and each of its 141 variations is the one `varied` gives for the draw Jambot drew (measured in Jambot's tree, at its switch).
- **The draw:** `varied` takes the index `pick(draw, ones)` takes, over 10,000 draws evenly spaced in [0, 1) on each of the eight bars.
- **The anchors:** `anchorsOf` gives `&kick` and `&backbeat` on 8 of 8 E31 bars; the lifted backbeat rule equals Jambot's `backbeatOf` on each of the seed library's 13 meters.
- **Never an anchor moved:** for every variation of the eight bars, `sameNotes(source, variation, anchored)`.
- **Other notes:** no variation plays the notes of its source or of another variation of it (0 of 284 do in Jambot's today, by the probe); each one's holes are its source's.
- **Speed:** every variation of one E31 bar on its workbench in under 50 ms (Funk's 49), Jambot's warm-up slice (yggi/jambot#412); `varied` under 5 ms beyond its source's compile, Jambot's ask (yggi/jambot#408). Here Funk's bar compiles in about 2 ms, and one S2 check takes about 14 ms, so the tests check S2 and the tool never does.

**Rung 2, the pitched operators** (transpose, invert, reverse, the root anchor), for yggi/jambot#423, once its five bass seeds are files in cells:

- On each of the five seeds, on its own workbench: every variation plays other notes than its source and the others; the root on each chord change plays as before; every other note plays what the language's own form plays: `&x^n` for each n, `degree(inverse(&x), 2f)`, the retrograde within each span. Up to 30 variations (5 × 6); the pull request names any left out, and why.
- The lead's (yggi/jambot#424) map onto these: lift is transpose by 2 and turn over is invert, each reproducing the first two ways of the lead's `varied` (before its nudge) note for note on its shapes, in Jambot's tree; bending the last note and dropping it (the note before held to the bar's end) join as operators of their own when that rung starts: **bend** and **trim** (#267), pitched operators after reverse. The lead's drop is `trim`, not a pitched `drop`: an operator's name acts on one kind of line, and `drop`, a rhythm operator a frontend gets where it names none, would then leave the last note of a pitched line out for a frontend that asked only for the rhythm ones.

**Rung 3, harmony** (yggi/jambot#425): substitution by a secondary dominant toward a slot and a slot reharmonised by a third, with the cadence as their anchor, specified with numbers when yggi/jambot#425's seed progressions are files.

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
