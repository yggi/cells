# 103 · The meter fragment is `bar`: `bar(meter="3/4")`, the common meters straight, each style's feel a fragment of its own

**Date:** 2026-11-23 · **Status:** accepted (the owner on #902, 2026-11-23: "rename the fragment to 'bar', keep meter() for the function, use meter= as argument instead of grouping="; the common meters only, "also no swing and grouping", each style's meters a fragment of their own; swing inline, "agreed"; "drop ambient_meter") · Issues: #902, #507, #920, yggi/jambot#751, yggi/cell-studio#701 · Amends [072](072-even-is-the-foundation.md) §3 (#507's one meter fragment, `&bar base=&grouping`)

*Read with [101](101-a-text-cell.md) (a text cell), [102](102-a-meter-counted-in-n.md) (a meter counted in n), [099](099-a-name-on-its-facets-axes.md) and [100](100-an-offset-from-a-style-is-a-sum.md) (named points, offsets), [104](104-a-cell-meets-as-what-it-is.md) (the fit), and `docs/notes/meter-fragment-refined.md`.*

## Context

#507 made the thirteen meters one fragment, `meter`: `&bar base=&grouping step=&tempo swing=&swing`, a grouping and a swing its parameters, each a placeholder cell holding its default.
- **One name was two things:** the fragment and the generator, `from meter(grouping=meter("7/8"))`.
- **Its points were numbers**, though all but seven were a style's exactly.
- **Its taken copy was three cells** (`bar`, `bar_grouping`, `bar_swing`), three nodes in Cell studio, where the meter is one wheel.

## Decision

1. **The fragment is `bar`,** in `fragments/meters/bar.md`.
   - Its signature is `&bar from (&meter) &tempo` and its head `&bar meter(&meter) step=&tempo`, with `&meter "4/4"` its default: a text cell (101).
   - So `&bar from bar(meter="3/4") &tempo` is `&bar meter("3/4") step=&tempo`.
   - `meter()` stays the generator.
2. **It holds the common meters, straight:**
   - 4/4 at fourteen styles' points, Ambient's among them (below);
   - 3/4 at Waltz's, and beside Spooky's (+.08 bite);
   - 2/4 at March's and its own;
   - 6/8 at its own, and beside Spooky's (−.08);
   - 12/8 and alla breve (`"4/4 in 2"`, 102) at their own.
3. **A style's feel is a fragment of its own, its swing written on the bar's line:**
   - `funk_meter`, `16n:.6`: Deep house, Funk, and Acid +.1 bite at .5;
   - `swing_meter`, `8n:2/3`: Blues shuffle, Swing jazz, Electro swing;
   - `lofi_meter`, `16n:.65`: Lo-fi hip hop.

   Each is the line `&bar meter("4/4") step=&tempo swing=…`, so its text holds itself: a host that reads it alone, as Jambot's meter reader and a workbench do, needs no library.
4. **The odd groupings are `odd_meter`:** 5/4 at Spooky's point and its own, 7/8 and 10/8 at their own. The aksak go here.
5. **Swing is inline on the bar** (the owner, 2026-11-23), as `step=` is: `&bar swing=8n:2/3 from bar &tempo` (065 §4; #899). A cell enters only where the share moves, `swing=16n:&groove` (081).
6. **Ambient's lean of 16n:31/60 is dropped** (the owner): its bar is the straight 4/4.
7. **Points are named** (099), with an offset where one is beside a style (100). The seven points no style holds stay numbers, at .75.
8. **No Migrate rule:** before 1.0 a retired form is an error (#643). `from meter` finds no fragment, and `changes/` gives the map from each old id to its new one.

## Why

- **One name, one thing:** `bar` is what the cell is, `meter` the function its argument goes to.
- **A meter is one cell:** the copy is the bar and, where its meter is an argument, the text cell it reads. Cell studio's wheel is that cell.
- **A style's feel says whose it is:** `funk_meter` is found at Funk's point and named for it. A swing is no common meter.

**Why not** `grouping=`: a grouping is the generator's argument, so `meter=` passes it as written. The bar's braid before `from` (the issue's first proposal) would have needed a form of its own and a variant id no `from` line writes.
**Why not** the style fragments taking `bar` (`&bar swing=16n:.6 from bar &tempo`): a text that names another fragment needs the library to compile, and Jambot reads a meter fragment's text alone.

## Consequences

- **Every style finds what it found, renamed,** at the same distance (`npm run coverage -- --facet meter`), but Ambient, whose bar is straight now.
- **No example's notes or events move.** The values' hash moves where a piece takes the meter fragment: its private cells are one text cell now, where they were a grouping and a swing.
- **Ids, for a frontend's map** (`changes/bar-fragment.md`): `meter` → `bar`; `meter(swing=8n:2/3)` → `swing_meter`; `meter(swing=16n:.65)` → `lofi_meter`; `meter(swing=16n:.6)` → `funk_meter`; `meter(swing=16n:31/60)` → `bar`; `meter(grouping=meter("X"))` → `bar(meter="X")` for 2/4, 3/4, 6/8, 12/8; `meter(grouping=meter("2/2", 2))` → `bar(meter="4/4 in 2")`; 5/4 → `odd_meter`; 7/8, 10/8 → `odd_meter(meter="X")`.
- **Alla breve's pulse is a quarter now** (102): a host that compares a meter's pulses (Jambot's `sameMeter`) meets 4 quarters in two beats where it met 2 halves.
- `cycles.ts`'s `meterText` writes `&bar swing=… from bar(meter="…") &tempo`; Normalise writes a line that is the template's, `from bar(meter="7/8")`, its swing a line's own; the core writes a text cell's argument into its call.
- A text cell has a kind of its own (`text`, `kinds.ts`).
- Tests: `meters.test.ts`, `swing.test.ts`, `fit.test.ts` and the others the ids reach.
