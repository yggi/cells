# 088 · Naming a number plays as the number: the plain values

**Date:** 2026-11-13 · **Status:** accepted (the owner, 2026-11-13, on the three questions of the pass over the language: "all as recommended") · Issues: #754, #755

*Amends [006](006-mix-algebra.md) (the mix algebra: what a plain value is) and [079](079-a-sum-of-cells-and-a-window.md) (a sum of values, read in a product). Read with [087](087-a-named-product-is-its-parentheses.md) (naming a sub-product plays as its parentheses do) and [075](075-a-name-is-only-a-name.md) (a name is only a name).*

## Context

Decision 006 gives a plain value no sort of its own: a number or a `map=lin` cell takes its operator's, a gain in a product and semitones in a sum. A number given a cell of its own was not one of them. It fell to the last sort rule ("anything else: a pitch"), so a name changed what a number meant (on `main`, 3753279):

| text | played |
|---|---|
| `[&t * 12 * &lead]` | the notes of `&t`, twelve times louder |
| `&k 12`, then `[&t * &k * &lead]` | the notes of `&t`, an octave up |
| `&vol .5`, then `[&t * &vol * &lead]` | a quarter tone sharp at full level, and no diagnostic |

A moving parameter already read the same cell as its value (`lpf=200..2000 * &vol`, a share of .5). So one cell was a value to a parameter and semitones to a product.

A sum of values (079) had the same gap. As a factor of a product with a sound, `&d [&a * .7 + &b * .3]` changed neither level nor pitch, and said nothing (#755).

Over the 89 examples, no mix names a cell that is one number: the event snapshot doesn't move.

## Decision

1. **The plain values are four, and each takes its operator's sort**, a gain or a level in a product, semitones in a sum:
   - a number;
   - **a cell that is one number and nothing else**;
   - a `map=lin` cell, as before;
   - **a sum of values** (079), in a product.
2. **A cell that is one number** has a braid of one plain number, and no clock (`step=`, `loop=`), table (`over=`, `base=`), `map=`, move (`shift=`, `stride=`, `cycle=`) or parameter. Named bare in a mix it is written as its number before the mix is typed (`inlineNumbers`), as 087 writes a named product. So `&vol .5` halves, `&inv -1` inverts the phase, and `(&t + &oct)` with `&oct 12` is an octave up, as it was.
   - Its number may be a `free()`: a slider's value now, as a gain left free in a mix is (078).
   - A cell that is the number 0, as a factor, warns: a gain of 0 is silence, and a note with no clock may have been meant (`&a 0`, `[&a * &lead]` was "Nothing starts notes").
   - A weight or a constant of a sum of values, and a factor of notes with their levels (087), may be named so too.
3. **What is more than one number stays what it was:**
   - a note by name (`&tonic D`) is a pitch;
   - a table of several numbers (`&k 0 4 7`) is a table, and a pitch in a mix;
   - a line with a clock (`&k step=1m 12 7`) is a line of notes;
   - a reference that picks or moves the cell (`&k[0]`, `&k^2`) reads it as it did.
4. **A sum of values in a product is a level**: its weighted sum at each moment, held to 0…1 as a factor's share is (079). It crossfades two level lines, which no product could write (volumes don't add). In a pitch sum it is an error that says so: as semitones it has no reading yet.
5. **The law (L18): naming a number plays as the number.** Every example, with each plain number of its own mixes given a cell and named, plays what it played.

**Why not** keep the sort and warn: nothing a text plays would change, and a name would still change a number's meaning; the law could not be stated.
**Why not** an error for a constant pitch as a bare factor: it refuses the text a writer means (`* &vol`), to keep a reading no example uses.
**Why not** a table of several numbers as plain: it has no single value, and a pick already reads one (`&k[0]` in a braid).

## Consequences

- **A text changes meaning** where a cell of one number was a bare factor of a product and meant a transposition: `&oct 12`, `[&t * &oct * &lead]` played an octave up, and now plays twelve times louder. Written as a sum, `[(&t + &oct) * &lead]`, it plays the octave before and after. **Migrate can't write it:** the old form and the new one are one spelling, so no rule can tell which was meant. No example and no seed fragment holds it.
- **The sorts' table** (`SORT_RULES`) gains two rows of `plain`, and the reference with it.
- **A frontend** may see `sort: 'plain'` on a cell with no `map=`. A slider on such a cell moves a gain where the text is recompiled as it moves (078); whether a host moves it without a recompile is its own.
- **Open:** a sum of values as semitones; a table of numbers read as a value.
