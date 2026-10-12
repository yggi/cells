# Cells

The anatomy of one line of code: a cell is `&name`, attributes, and a braid, in any order.

```cells
&bar scan(4 4 4 4) step=84bpm
&tune step=&bar 0 2 4 ~ 5@2
&fill step=&bar 0 [2 4] [5 [4 2]] [0 2, 7]
```

- **One cell per line.** A line ending in `,` `[` `+` or `*` continues on the next. `#` starts a comment.
- **Attributes** are `key=value` (`step=`, `loop=`, `over=`, `shift=`, `stride=`, `cycle=`, `map=` …) and go anywhere on the line. Each has its own page: see [the overview](overview.md).
- **A braid** is what's left: a list of steps, a generator, or blank. A blank braid is the identity of the table below it (the default grid, the 12).
- **Steps**: numbers (`.5` is fine, `9/8` a fraction), `~` (a rest), `[0, 2, 4]` (a chord: commas), `[0 2 4]` (a subsequence: below), `&cell`, `&cell[i]`, `&cell[a:b]`.
- **A number is an index, a name a pitch.** A number is an entry of the table the cell reads; a note by name — `C`, `F#`, `Bb3`, `C5` (octave 4 when left out: the voice's pitch 0) — is that pitch, on the grid at the root of the tables, whatever they are. `&chord [C, E, G]` is C E G over any scale; `[0, E, 4]` mixes the two. A name sits on the grid, so `^n` (degrees) and `^$n` (grid steps, [decision 015](../decisions/015-caret-is-degrees.md)) move it alike: `&q C E G` then `&q^2` is D F♯ A, two semitones up. Numbers over a scale tell them apart: `&n 0 2 4` then `&n^2` is two degrees up (E G B), `&n^$2` two semitones (D F♯ A).
- **Modifiers**: `!n` repeats a step n times, `*n` plays it n times within its time (a ratchet), `@n` holds it for n steps, and `_` after a step holds it one step more, as in Strudel (`0 _ _` is `0@3`). `0!4` is `0 0 0 0`; `4@2` lasts as long as two. A cell stands for at most 50,000 notes, its `&cells` spliced in (`MAX_EVENTS`, `src/engine/program.ts`): `&a!4000` over an `&a 0!4000` is an error at that step. Cells spliced into each other (`&a &b`, `&b &c` …) go 256 deep at most (`MAX_SPLICE_DEPTH`).
- **Subsequences** (as in Strudel's mini-notation, [decision 027](../decisions/027-on-top-of-strudel.md)): `[0 2 4]` squeezes its steps into the one step it takes, a third each; they nest, `[0 [2 4]]` is a half and two quarters. Modifiers inside share the step out: `[0 2@2]` is a third and two thirds, `[0!2 4]` three thirds, `[0 ~ 4]` rests in the middle, `[0*2 4]` ratchets in the first half, `[0? 4]` may drop the first. Modifiers on the bracket act on all of it: `[0 2]@2` lasts two steps, `[0 2]!3` is three steps of it, `[0 2]*2` plays it twice within its step, `[0 2]?` may drop each of its notes. Commas stack: `[0 2, 4]` plays `0 2` over a `4` held the whole step (`[0, 2, 4]`, plain numbers between commas, is a chord). A bracket is one step to everything around it: a pick (`&x[1]`), a run, `base=` (whose `_` keeps whole steps, so stands outside brackets). A cell spliced inside takes its slot and squeezes its steps into it, as Strudel does a pattern (`&a 0 2 4 5` then `[&a 7]`: &a's four notes in the first half); outside brackets a splice lasts its own steps. A choice is between numbers, `[0|4|7]`; a choice of sequences (`[0 2|4]`) isn't read yet. In a groove, `&bd [&hh &hh]` is two hats in one step.
- **Accidentals**: `6#` raises a step, `3b` lowers it.
- **Chance**: `x?p` drops a step with probability p, as Strudel's `degradeBy` (`9?`, `13?.4`: dropped four times in ten); a bare `?` is a half, or the cell's **`chance=p`** (or `chance=free(.7, 0..1)`, a slider), also the probability of dropping. **`seed=n`** picks the cell's sequence of chance; the default comes from its name. Each time round draws anew, but the draws are seeded: the piece is the same every time you play it.
- **`&( … )`** is an unnamed cell, written where it's used, with the same body as a declaration (one inside another, 32 deep at most):

```cells-fragment
&x over=&(scan(2 1 2 2 1 2 2) over=&(shift=7)) 0 2 4
&m &(4 5)[<<] 0
&mix [(&theme + &(loop=5 0 .1 0 -.1)) * &lead]
```

- **`off`** switches a cell off: it silences it and everything that reads through it or plays it.
- **Note names** are rates from the environment, tuned from `A4` (440 by default): `loop=C4`, `loop=F#3`, `loop=Bb2`. See [tuning.md](tuning.md).
- **Names**: the first note with `title=` names the piece; see [display.md](display.md).

A played braid's moving shift is its playhead; a table's moving shift turns what reads through it, looping within its cycle ([time.md](time.md)).
