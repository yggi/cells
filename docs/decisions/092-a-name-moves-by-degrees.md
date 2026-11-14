# 092 · A name moved by degrees is the degree it sits on

**Date:** 2026-11-14 · **Status:** accepted (the owner on #756, 2026-11-14: "yes on 756", its option A) · Issues: #756

*Amends [015](015-caret-is-degrees.md) (`^n` moves by degrees, `^$n` by grid steps). Read with [033](033-degrees.md) (an accidental moves with its note) and [052](052-variations-as-operators.md) (Vary's transpose and invert are `^n` and `inverse()`).*

## Context

Decision 015 made `&x^n` the relative move, by degrees of the table, and `&x^$n` the absolute one, by grid steps; `$` is the absolute frame (I5). A note by name is a pitch on the root grid, whatever its tables, so `^n` moved it on that grid: the absolute move, without the `$`. Over `&key scale(major, C)` (on `main`, ab6a634):

| `&q` | `&q^2` played | |
|---|---|---|
| `0 2 4` | E G B | two degrees |
| `C E G` | D F♯ A | two semitones |
| `0 E 4` | E F♯ B | the numbers two degrees, the name two semitones: F♯ is not in the key |

One operator, two meanings by how its operand is spelled, and no diagnostic.

## Decision

1. **A note by name, moved by degrees (`&x^n`, `degree(&x, n)`, `inverse(&x)`), is read as the degree it sits on** in the table it would read as a number, and moved as a number is. `C E G` over C major is `0 2 4`, so `^2` is E G B.
2. **A name off the table is the degree under it, raised** by whole steps of the grid under the table: `F#` over C major is its `3#`. The accidental goes with its note (033), so `^1` is G♯.
3. **As written, a name is its pitch**, as it was: nothing reads it as a degree until a move by degrees does. A key that turns under it leaves it where it is.
4. **`^$n` moves a name on the grid**, as it moves anything.
5. **Over no table** (the default grid) a degree is a grid step, and `^n` moves a name as it did.
6. **Where the table has no degree for it** (a table that doesn't climb, a pitch between its grid's steps) the name stays a pitch and moves on the grid, as it did.

The degree is read in the table as it stands when the piece is compiled, its `shift=` and its reference's taken (`degreeOf`, `flatten.ts`). A table that turns while the piece plays is read as it starts.

**Why not** an error on a phrase that mixes names and numbers (option B): it refuses a phrase `cell.md` teaches (`[0, E, 4]`), where the move has one musical reading.
**Why not** a warning alone (option C): the phrase would still leave its key.

## Consequences

- **A text changes what it plays** where a note by name is moved by `^n` or `inverse()` over a table: by degrees, where it was by grid steps. Written `^$n`, it plays as it did. No example and no seed fragment holds the form: the event snapshot doesn't move.
- **Vary's pitched operators** (052) move a line of names as they move a line of numbers.
- **Open:** a name moved over a table that turns while the piece plays (3 reads it as it starts).
