# 101 · A text cell, and every generator's value arguments read cells: `&meter "3/4"` read by `meter(&meter)`, `euclid(&k, 8)`

**Date:** 2026-11-23 · **Status:** accepted (the owner on #902, 2026-11-23: rename the meter fragment `bar`, "use meter= as argument instead of grouping= to pass the function arguments", `&bar from bar(meter="3/4") &tempo`; then "go ahead with the text cell", and "check if we can and should generalize this behaviour, e.g. for the other generators") · Issues: #902 · Amends [093](093-a-generator-reads-a-cell-that-is-one-number.md) (its open rungs: `euclid`, the waves)

*Read with [065](065-fragments-take-arguments.md) §5 (an argument is a cell), [078](078-every-number-may-be-free.md) (a number read as the piece is built is a number or a slider) and [088](088-naming-a-number-plays-as-the-number.md) (a cell that is one number).*

## Context

The meter fragment is to be `bar`, its grouping a parameter `meter` passed to the generator: `&bar from bar(meter="3/4") &tempo`, the fragment's head `&bar meter(&meter) step=&tempo`.
Two things stood in the way (measured at c8189952):
- **An argument is a cell** (065 §5), so `meter="3/4"` became `&bar_meter "3/4"`, and a cell couldn't be a text: a parse error.
- **A generator read a cell only for `even`'s numbers** (093). `meter(&meter)` was refused, and 093 left `euclid` and the waves to "when a text asks".

## Decision

1. **A text cell** is a cell whose braid is one text in quotes: `&meter "3/4"`.
   - It has nothing else in its braid: no step, no second text, no generator. Its attributes (a `label=`) are its own.
   - It plays nothing.
2. **A generator's value argument may read a cell**, filled as the piece is built:
   - a cell that is one number (088), where the argument is a number;
   - a text cell, where the argument is a text.
   This is 093's rule, for every generator, by one mechanism: the cell's value is written into the call and the call is read again, so a generator reads a cell's value exactly as it reads the value written. A slider in the cell (`&k free(3, 1..7)`) is its value now, as 093 reads one.
3. **The value arguments**, by generator, are one table (`VALUE_ARGS`, `parser/generators.ts`):

   | generator | value arguments |
   |---|---|
   | `meter(sig, step)` | its signature, a text; its step, a number |
   | `euclid(k, n, r)` | all three, numbers |
   | `sin(n)`, `saw(n)`, `tri(n)`, `square(n)` | n, a number |
   | `spell(text, &table, names)` | its text and its names, texts |

   **Not values:**
   - `scan`'s list: a list is no value;
   - `spell`'s table: a cell it reads by reference, as before;
   - `scale`'s mode and tonic: read by its cell already (#363, 093 §5);
   - `even`'s arguments: 093's own path, whose phase may step at each bar line (081);
   - `fifths(n)`: read by its cell's own path, a rung when a text asks.
4. **A text read anywhere else is an error that says where a text is read**: a braid's step (`&t &meter`), a factor (`lpf=200..900 * &meter`). A cell of the wrong kind for its argument says which kind is read (`&m 3` as meter's signature: "a text cell").

## Why

- **The fragment's parameter is the generator's argument**, so `bar(meter="3/4")` reads as `meter("3/4")` does. No form of the fragment's own repeats the generator.
- **One rule for every generator** (the law of generalization): 093 already ruled it for `even`'s numbers, a text is the other kind a generator reads, and filling the call and reading it again keeps each generator's reading in one place.
- **A text cell is a cell like any other** (065 §5: an argument is a cell): it has a name, a label, a node in the graph, and a use's copy names it (`&bar_meter`).

**Why not** a text argument written into the fragment's text by its use (a macro): a use's arguments are cells (065 §5), and a piece that gives `meter=&mine` would bind nothing.
**Why not** a text cell readable as a step (a label to show): no reader asks for one, and a text where a step's number is read would be a guess.

## Consequences

- `meter(&m)` is `meter("…")`, every form: a signature, groups as sizes, levels, with a step; through a fragment's parameter alike.
- `euclid(&k, &n)`, the waves and `spell(&word, &keys, &names)` read their cells.
- The places of numbers (`free.md`, 078's table): `euclid`'s and `meter`'s arguments now read a cell.
- No example's or fragment's events move.
- Tests: `textcell.test.ts`, `numbers.test.ts`.
