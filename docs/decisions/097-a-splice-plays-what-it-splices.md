# 097 · A splice plays what the cell spliced is, in its step: a value its value, so a line of values may splice value cells

**Date:** 2026-11-16 · **Status:** accepted (the owner on #810, 2026-11-16: "go ahead with rung 1 of 810. close the gap as suggested. check how this fits as a generalization for the language, not as a special case.") · Issues: #810 (rung 1), #571 (step 3), yggi/jambot#547 rung 5

*Read with [079](079-a-sum-of-cells-and-a-window.md) (a mix of cells with no voice is the sum of their values), [088](088-naming-a-number-plays-as-the-number.md) (naming a number plays as the number, law L18), [087](087-a-named-product-is-its-parentheses.md) (notes with their levels), [096](096-intensity-an-offset-the-levels-read.md) (a section's intensity) and [067](067-a-module-after-its-voices.md) §5 (a line below 0 is a wave).*

## Context

A section plan names what each section holds and lists them, one step a section: `&intensity step=1m/8 &groove &breakdown &build &drop`, where `&breakdown [&song + -.45]` is a kind's intensity (decision 096). On `main` @ 07ed460 it could not be written:
- spliced into a line, a sum of values played nothing: flatten takes a spliced cell's steps, and a sum has none, so each of its steps read 0;
- a line that splices cells was no line of values, so a sum refused it as a term: `&song .7`, `&b .25`, `&i step=1m &g &b`, then `[&i * .5 + .5]` gave "&i has no voice";
- a selector over a table of values (`&kinds &groove &breakdown &drop`, `&intensity over=&kinds step=1m/8 0 1 2`) was refused too ("A gain inside a pitch sum").

Only a line of literal numbers played (`&intensity step=1m/8 .7 .25 1`). That loses the kinds' names and their offsets from the song, and a line below 0 is a wave (067 §5), so it can't hold the offsets themselves.

**The readers disagreed.** A moving parameter already read a cell that is one number spliced, as its number: `lpf=0..1000 * &x` with `&x step=1m &g &b` played 700 and 250. A `map=amp` line played spliced numbers as levels. The same line was refused as a term of a sum, read as nothing where it spliced a sum, and a style's axis laid its literal numbers into the axis's range but left a spliced cell as written. One text, four readings.

## Decision

1. **A splice plays what the cell spliced is, in its step, whatever its sort.**
   - A melody spliced plays its notes, as it always has.
   - A cell that carries a value plays its value:
     - a cell that is one number plays its number (088, law L18);
     - a level (`map=amp`, `db`, `lin`) plays its levels;
     - a sum of values (079) plays its sum: one step, read while the step lasts, so a term that moves moves it there (a build's ramp inside a section);
     - a line of values that splices one of these carries it on.
2. **A line of values may splice value cells, and is a line of values still.**
   - Every reader of a value reads it alike: a level (a factor, a gate's `level=`), a moving parameter, a style's axis (each spliced value laid within the axis's range, as a written one is), a term of a sum.
   - A section plan is so written:

     ```text
     &intensity step=1m/8 &groove &breakdown &build &drop
     ```

3. **A plain line of numbers carries no sort of its own:** what reads it decides, degrees or values.
   - So a line that splices plain lines alone stays what it was, a pattern its reader reads (a melody of phrases, `&tune &a &b`).
   - In a voiceless product it stays decision 087's notes with their levels, not a sum.
4. **A line that splices a sum of values has no notes to play.** As a melody, or in a pitch sum, it is an error that says so, as 088 says it of a sum of values.
5. **Signs are as written.** A cell that is one number spliced keeps its sign, and a line whose values run below 0 is a wave (067 §5), as before. An offset stays inside a sum (096), where it is a number added, not a step of a line.

**Why not** a selector over a table of values (`&intensity over=&kinds step=1m/8 0 1 2`): it says the same in two lines, and a table of values would be a second kind of table beside a scale's and a kit's, its entries indexed where a splice names them.
**Why not** a word of its own for a plan of values (`map=plan`): the splice already means "this cell, here", and a value spliced reading as its value is what L18 already says of a number named.
**Why not** a plain line spliced carrying a value too: a melody of phrases (`&tune &a &b`, korobeiniki's) would become a line of values, and in a voiceless product a sum (079) instead of notes with their levels (087). Measured: four of the examples' named sub-products would then read differently, and law L17's check skipped 61 where it skips 57. A plain line has no sort to carry, so it carries none.
**Why not** read a spliced sum once, at its step's start: a build's ramp moves inside its section, and a sum is a value that moves with its terms. Read once, the build would hold its first bar's 0.35 through all eight.

## Consequences

- **cells, with this decision:**
  - `isValueLine` takes a splice of a cell that carries a value (`valuesum.ts`, `carriesValue`);
  - flatten plays a spliced sum as one step that reads it (`StepEvent.reads`);
  - a series keeps the sums its steps read (`Series.reads`), and `levelSeries` reads them while their steps last;
  - a style's axis lays a spliced cell as it lays a written number (`styles.ts`);
  - the error for a line that splices a sum and is read as notes (`sorts.ts`).
- **Nothing a piece plays moves:** no example splices a value cell into a line that was refused or read as nothing. 0 event snapshots move, and law L17's check names what it named.
- **#810's bound holds:** `&intensity step=1m/8 &groove &breakdown &build &drop` at a song of .55 plays Jambot's `barEnergy` for its 32 bars within 1e-9 (`splice.test.ts`), and through the default band's drives the drums send `round(127 · (0.65 + 0.35 e))` bar by bar (`band.test.ts`).
- **#810's next rungs** write the section kinds as fragments, each its offset, the plan splicing them by name.
- **A `map=lin` line that splices a sum** reads the sum while its step lasts, and doesn't ramp into or out of that step: a ramp runs between numbers, and a sum's step has its own motion.
