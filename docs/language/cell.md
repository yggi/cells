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
- **Modifiers**: `!n` repeats a step n times, `*n` plays it n times within its time (a ratchet), `@n` holds it for n steps. `0!4` is `0 0 0 0`; `4@2` lasts as long as two.
- **Accidentals**: `6#` raises a step, `3b` lowers it.
- **`&( … )`** is an unnamed cell, written where it's used, with the same body as a declaration:

```cells-fragment
&x over=&(scan(2 1 2 2 1 2 2) over=&(shift=7)) 0 2 4
&m &(4 5)[<<] 0
&mix [(&theme + &(loop=5 0 .1 0 -.1)) * &lead]
```

- **`off`** switches a cell off: it silences it and everything that reads through it or plays it.
- **Note names** are rates from the environment, tuned from `A4` (440 by default): `loop=C4`, `loop=F#3`, `loop=Bb2`. See [tuning.md](tuning.md).
- **Names**: the first note with `title=` names the piece; see [display.md](display.md).

A played braid's moving shift is its playhead; a table's moving shift turns what reads through it, looping within its cycle ([time.md](time.md)).
