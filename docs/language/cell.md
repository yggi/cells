# Cells

The anatomy of one line of code: a cell is `&name`, attributes, and a braid, in any order.

```cells
&bar scan(4 4 4 4) step=84bpm
&tune step=&bar 0 2 4 ~ 5@2
```

- **One cell per line.** A line ending in `,` `[` `+` or `*` continues on the next. `#` starts a comment.
- **Attributes** are `key=value` (`step=`, `loop=`, `over=`, `shift=`, `stride=`, `cycle=`, `map=` …) and go anywhere on the line. Each has its own page: see [the overview](overview.md).
- **A braid** is what's left: a list of steps, a generator, or blank. A blank braid is the identity of the table below it (the default grid, the 12).
- **Steps**: numbers (`.5` is fine, `9/8` a fraction), `~` (a rest), `[0,2,4]` (a chord), `&cell`, `&cell[i]`, `&cell[a:b]`.
- **A number is an index, a name a pitch.** A number is an entry of the table the cell reads; a note by name — `C`, `F#`, `Bb3`, `C5` (octave 4 when left out: the voice's pitch 0) — is that pitch, on the grid at the root of the tables, whatever they are. `&chord [C, E, G]` is C E G over any scale; `[0, E, 4]` mixes the two. A name sits on the grid, so `^n` (degrees) and `^$n` (grid steps, [decision 015](../decisions/015-caret-is-degrees.md)) move it alike: `&q C E G` then `&q^2` is D F♯ A, two semitones up. Numbers over a scale tell them apart: `&n 0 2 4` then `&n^2` is two degrees up (E G B), `&n^$2` two semitones (D F♯ A).
- **Modifiers**: `!n` repeats a step n times, `*n` plays it n times within its time (a ratchet), `@n` holds it for n steps. `0!4` is `0 0 0 0`; `4@2` lasts as long as two. A cell stands for at most 50,000 notes, its `&cells` spliced in (`MAX_EVENTS`, `src/engine/program.ts`): `&a!4000` over an `&a 0!4000` is an error at that step. Cells spliced into each other (`&a &b`, `&b &c` …) go 256 deep at most (`MAX_SPLICE_DEPTH`).
- **Accidentals**: `6#` raises a step, `3b` lowers it.
- **Chance**: `x?p` sounds a step with probability p (`9?`, `13?.6`); a bare `?` takes the cell's **`chance=p`** (or `chance=free(.3, 0..1)`, a slider). **`seed=n`** picks the cell's sequence of chance; the default comes from its name. Each time round draws anew, but the draws are seeded: the piece is the same every time you play it.
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
