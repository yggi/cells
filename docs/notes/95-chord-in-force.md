# The chord in force: how a line reads the chord sounding now

Date: 2026-10-17 · Status: proposal, for the owner · Issue: [#95](https://github.com/yggi/cells/issues/95), a rung of the central roadmap [#81](https://github.com/yggi/cells/issues/81) (twin: [yggi/jambot#358](https://github.com/yggi/jambot/issues/358)) · Tool: `tools/chord-in-force.ts`, held by `tools/chord-in-force.test.ts`

Jambot's E33 ([yggi/jambot#359](https://github.com/yggi/jambot/issues/359)) states the harmony once, `&harm over=&key step=1m [0,2,4]`, and nothing reads it: the bass and the comp state every note again as a degree of the key.
2,862 of their 2,979 notes are tones of the chord sounding.
This note measures four ways a line could read that chord instead, and the way E33 has now, on E33's 384 bars, and recommends one.

## What cells does today

`over=&t` reads a table's entries in order, past the end climbing a lap (tables.md).
A braid of stacks is read **flattened, as turned**: its stacks' tones one after another, starting at the stack the turn has brought round.
So a number inside the chord sounding plays that chord's tone, and one past its last tone plays the **next chord's**.
Over `&harm over=&key step=2n [0,2,4,6] [4,6#,8,10]` from C1, `0 1 2 3 4` plays A1 C2 E2 G2 **E2**, where the chord's root a lap up is A2 (#95's witness).

Two of the 77 examples already read a braid of stacks this way, both inside the chord sounding: *Prelude in C* (`&figure over=&chords 0 1 2 3 4 2 3 4`) and *BWV 847* (`&rhFigure over=&rhShapes`).
Within the chord, today's reading is already the chord in force; it parts from it only past the chord's last tone, or below its first.

A second gap sits under every option: **a stepped table turns once a step, whatever its `@` and `!` say.**
`&harm over=&key step=4n [0,2,4]!3 [5,7,9]` read on `4n` plays A F A F, not A A A F; `[0,2,4]@3 [5,7,9]` the same.
None of the 11 turning tables the examples read holds a `@`, a `!` or a subsequence, so turning by the braid's own steps would move none of them (a scan of the compiled examples; not prototyped).

## The probe

The fixture, `fixtures/jambot-chord-in-force.json`, is lifted from yggi/jambot `packages/score/experiments/bar-in-cells.ts` @ d225286: each bar's meter, key, harmony, bass, pad and stab lines as E33 writes them, the chords Jambot composed and each note as written.
The tool restates every bass, pad and stab note as an index into the chord sounding at its onset: `i` a tone of the chord, past its last tone the chord a lap up (the key's seven degrees), `i#` or `ib` a degree of the key beside one (an accidental steps the table below, decision 015).
A note no index reaches keeps its degree of the key, and so does its line.
Then cells plays each reading, and every note is compared with the band's (channel, 16th, MIDI key):

- over E33's **bar texts**, one bar each, 384, where 378 bars hold one chord;
- over **section texts**: each run's bars as one text, cut where the key changes, 23 sections, with the harmony a braid of every chord in them (a bar of two chords on `2n`, a whole bar's chord stated twice to step past the turning gap).

`node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/chord-in-force.ts` prints every number below in about 3 s.

### What every option shares

| | bass | pad | stab | all |
|---|---:|---:|---:|---:|
| notes | 927 | 678 | 1,374 | 2,979 |
| a tone of the chord sounding: `i` | 868 | 678 | 1,316 | **2,862** |
| a degree of the key beside one: `i#`, `ib` | 34 | 0 | 58 | 92 |
| neither (off the key) | 25 | 0 | 0 | 25 |
| off the chord sounding, a tone of the next bar's chord | 31 | 0 | 52 | 83 |

Of the 802 lines (a part in a bar), **781** can be stated over the chord in force, **720** with whole indices alone.
53 of the 55 section lines can.

Characters do not choose between the options, and do not argue for the chord in force either:
- **Bar texts:** an index is no shorter than a degree. E33's bass, pad and stab lines are 32,694 characters; restated over the chord where a line can be, 33,410 (+2.2 %), since a voicing below the root writes a minus (`[0,2,5]` over F major is `[-2,-1,0]`).
- **Section texts**, a run of bars that repeat the bar before written once (`x@16!k`): 13,070 over the key, 12,888 over the chord (−1.4 %). Jambot's lines vary bar to bar: a section's parts hold 488 distinct bars over the key and 448 over the chord.
- **The harmony**: 12,921 characters as 384 bar lines, 4,293 as 23 section braids.

What the chord in force buys is meaning, not length: the bass and the comp read the harmony, so a harmony changed by a player, the Muse or a fragment that leaves it open (#22) moves them with it.

### The options

| | spelling | bar texts: notes, bars | section texts: notes, sections | snapshots | `src/` change |
|---|---|---:|---:|---|---|
| 0, nothing (E33) | degrees of the key | 2,979, 384 | 2,979, 23 | none | none |
| today's reading | `over=&harm`, flattened | 2,969, 380 | 1,688, 0 | none | none |
| 1, `over=` reads the chord in force | `over=&harm` | **2,979, 384** | **2,979, 23** | **0 of 77 move** | about 30 lines |
| 2, a pick that follows | `over=&harm[0]` | 2,979, 384 | 2,979, 23 | none (an addition) | about 50 lines |
| 3, chord cells, a harmony of names | `&harm step=1m &i &VI`, `over=&harm` | 2,979, 384 | 2,979, 23 | none (an addition) | about 30 lines |
| 4, Strudel's chord and voicing | `n` over `chord("<Am F>").voicing()` | 720 of 802 lines | 35 of 55 lines | none (an addition) | 200 lines or more |

Option 1 was prototyped in `src/engine/helix.ts` on this branch and not committed (below): with it cells itself plays the restated `over=&harm` texts, all 2,979 notes in every bar and every section text, and every test passes, the event snapshots of every example among them (2,209 quick, 16 slow).
Options 2 and 3 give an index the same meaning, so their notes are option 1's, measured by lowering each index to the degree of the key it names (the tool's `lower`) and playing that: 2,979 in every bar and section.
Option 4's index takes no accidental, so 82 of the 802 lines keep their degrees.

#### 1 · `over=` reads a braid of stacks as the chord in force

```text
&harm over=&key step=1m [0,2,4] [5,7,9] [2,4,6] [4,6#,8]
&bass over=&harm step=16n 0@10 3@6
&pad over=&harm step=16n [-2,-1,0]@16
```

When every step of a table is a stack, a number read through it indexes **the stack sounding**: the one the turn has brought under tap 0. Past its last tone it climbs a lap of the table below (over a key, its seven degrees: an octave), below its first it falls one; an accidental steps a degree of the key, as on any number.
A braid of single numbers, or of numbers and stacks mixed, reads as today.

- **Change in `src/`:** `lookup` in `src/engine/helix.ts` reads the turned braid's first stack where every step is a stack (8 lines, prototyped); `shiftsAt` in `src/engine/clocking.ts` turns a table by its braid's own steps (`@k` holds a stack k steps, `!k` repeats it), the gap above, about 20 lines; tables.md's `over=`; a CHANGELOG line.
- **Snapshots:** none move. The prototype passes all 2,209 quick tests and the 16 slow ones; *Prelude in C* and *BWV 847* read inside their chords and play the same. A saved piece that reads past a stack's last tone plays the chord a lap up instead of the next chord: a change of meaning, for the CHANGELOG.
- **Strudel:** the meaning of `n("0 1 2 3").chord("<C Am F G>").voicing()`, where `n` indexes the chord in force and "overshooting numbers will be octaved" (`scaleStep` in `@strudel/tonal`). Cells already spells Strudel's `.scale("C:minor")` as `over=scale("C:minor")` (tables.md), so `.chord(…)` read by `n` is `over=` a harmony.
- **The next chord comes free:** `over=&harm[>>]`, a shift `over=` already takes, reads the stack one step ahead (prototyped: at Am7 it plays E7's tones), and `[<<]` the one behind. After the last stack the next is the first a lap up, as every turn that wraps climbs.
- **Dissolves** the flattened reading, a rule nothing uses: no example reads past a stack's last tone.

#### 2 · A pick that follows: `over=&harm[0]`

```text
&bass over=&harm[0] step=16n 0@10 3@6
&stab over=&harm[1] step=16n [0,1,2]@2 ~@14
```

`&harm[0]` is the tap at 0 on the turning braid, so it reads the stack sounding (decision 012: a pick is a fixed tap on a turning wheel); `[1]` the next, `[-1]` the last, `[$0]` the first as written.
Plain `over=&harm` keeps today's flattened reading.

- **Change:** `over=` takes a pick of one entry (today "over= takes a whole table"): the parser, the compiled cell (the pick beside `overShift`), `lookup`, the graph's wire from the tap; the turn by the braid's own steps as in 1; `npm run reference` and `npm run types`. About 50 lines.
- **Snapshots:** none can move: it is an error today.
- **Characters:** three more a line (`[0]`): 35,753 over the bar texts.
- **The next chord:** `[1]`, by name. A line reads one table, though, and the stab's next-chord notes share lines with tones of the chord sounding: they would need a second line.

#### 3 · Chord cells, and a harmony that steps which is in force

```text
&i over=&key [0,2,4]
&VI over=&key [5,7,9]
&harm step=1m &i &VI
&bass over=&harm step=16n 0@10 3@6
```

A stepped table of tables, read through, reads the table in force. Each chord is stated once, named, and each read alone is already the chord in force today (one stack: entries its tones, a lap the key's).

- **Change:** `resolveIn` follows the reference under tap 0 into that cell; the warning "a table is its numbers" gives way to it, as it does for kits, voices and a selector's taps (tables.md); the turn as in 1. About 30 lines.
- **Snapshots:** none move; today such a text warns, and no example warns.
- **Characters:** the harmony grows, since E33's chords seldom repeat within a text: 19,941 over the bar texts (against 12,921), 5,161 over the sections (against 4,293).
- **#29's** open item, "choosing a melody per step isn't built yet", is the same mechanism for melodies.

#### 4 · Strudel's chord and voicing

```text
n("[0,1,2]").chord("<Am F C G>").voicing()
```

Strudel names each chord by symbol, absolutely (`Am`, `F^7`), and `voicing()` turns it into notes by a dictionary and an **anchor** (in its `below` mode, the voicing whose top note is the highest at or under the anchor); `n` indexes the voiced notes, climbing an octave per lap.

- **Measured:** `n` takes no accidental, so 720 of the 802 lines and 35 of the 55 section lines can be said. Of the comp's 599 stacks over the chord in force, 543 are close (consecutive indices), and one anchor, F♯4, chooses 411 of them; Jambot leads the other voicings from its pin (E32's gap 3, the hand).
- **Change:** a chord symbol as a token, a voicing dictionary, its modes and anchor: 200 lines or more, and a second spelling of a chord beside the stacks over `&key` the owner chose (E32).
- **Symbols are absolute.** They don't move with a key; #50's numerals are the key's relative symbols, and two chord vocabularies would sit side by side.

#### 0 · Nothing: the frontend resolves the chord

E33's way: every note a degree of the key, 2,979 of 2,979, the fewest characters over the bar texts (32,694).
The comp states every chord again, voiced, and a changed harmony leaves the bass and the comp where they were.

## Relation to #50: numerals and the next chord

[#50](https://github.com/yggi/cells/issues/50) asks for numerals over a key, the next chord and the frame pin; none of that is built here.

- **Numerals slot into 1, 2 and 3 alike**: a numeral lowers to the stack it names (E32), so a harmony written `i VI III VII` over `&key` reads as the stacks do, and no line that reads it changes. Option 3's names (`&V7`) are a second way to name a chord beside numerals; option 4's symbols a third, absolute.
- **The next chord**: option 1 reads it with the shift `over=` takes today (`over=&harm[>>]`), option 2 by a tap (`[1]`), option 3 by a shift of the table of names, option 4 not at all. 52 of the stab's 58 notes off the chord sounding, and 31 of the bass's 59, are tones of the next bar's chord; in a section text that chord is in the braid. In a text of one bar it isn't, which is E32's gap 4.
- **The frame pin** (E32's gap 3) is what Strudel's anchor is: a later attribute on the line reading the chord could choose the voicing (411 of 599 stacks from one anchor), and it reads the same harmony under every option but 0.

Option 1 lets #50 slot in with the least: numerals change the harmony line only, the next chord needs no form, and the pin is an attribute for later.

## Recommendation

**Option 1, with the turn counted in the braid's own steps.**

- It is the only option under which cells plays every one of the 2,979 notes over `over=&harm` with no new form: 384 of 384 bars and 23 of 23 sections, where today's reading plays 1,688 notes in the sections and no section whole.
- No example moves: both that read a braid of stacks read inside the chord.
- Its meaning is Strudel's `n` over `chord(…).voicing()`, and its spelling is how cells already reads Strudel's `.scale(…)`: the overlap the owner chose `legato=` for (#94).
- #50 slots in: numerals replace the stacks in the harmony line alone, and the next chord is `over=&harm[>>]`.

**The cost:** about 30 lines in `src/` (`lookup`, prototyped at 8; the turn in `shiftsAt`, about 20), tables.md, and a CHANGELOG line, since a saved piece that reads past a stack's last tone plays the chord a lap up, not the next chord.
That is a change to what a form means, so it waits for the owner.
**Open with it:** whether a braid that mixes stacks and single numbers reads as the chord in force too (none does in the examples or in E33), and whether the turn by own steps is a fix of its own (it holds for any stepped table, a key with `!2` among them).

Characters are no reason for any option: an index is about as long as a degree, and over E33's bars slightly longer.

## The prototype of option 1 (not committed)

```diff
+const inForce = (result: CompileResult, name: string, shift: number): Entry[] => {
+  const a = shiftedUnits(result, name, shift)[0]!.atom;
+  return a.kind === 'chord' ? a.notes.map((v, j) => ({ value: v, alter: a.alters[j]! })) : [];
+};
+
 /** Entry x of a table (its own shift plus `extra`), climbing the helix outside [0, k). */
 export function lookup(result: CompileResult, name: string, x: number, shifts: Shifts, extra = 0): Entry {
   const c = result.cells.get(name)!;
   if (c.root) return { value: x + shifts(name) + extra, alter: 0 };
-  const es = entries(result, name, shifts(name) + extra);
+  const stacks = c.units.length > 1 && c.units.every((u) => u.atom.kind === 'chord');
+  const es = stacks ? inForce(result, name, shifts(name) + extra) : entries(result, name, shifts(name) + extra);
```

With it applied, the tool's `today` reading is option 1: 2,979 notes in the bar texts and in the section texts, and `npm run test:all` passes (2,209 quick tests, 16 slow).

## Not measured

The turn by the braid's own steps (only scanned), mixed braids of stacks and numbers, a harmony over a key that changes within a text, a voicing anchor as a cells form, the lead, captured music, and seeds other than 0.
