# 093 · One root meter a piece; the clocks of the wall are the environment's

**Date:** 2026-11-14 · **Status:** accepted (the owner on #778, 2026-11-14: "One meter plus wall-clock for 778") · Issues: #778, #757

*Amends [040](040-pulse-beat-and-laps.md) (a tap reads the piece's main meter) and [091](091-a-tap-names-its-meter.md) (a tap names its meter where a piece has several). Read with [080](080-a-meter-is-a-tree-placed-through-a-time-map.md) (a meter is a tree placed through a time map).*

## Context

Decision 091 made the order of a piece's lines irrelevant to what it plays (L19), and left a piece free to hold several meters with a tempo of their own, each tap naming its meter. Two things stayed open with it: what a host that shows one tempo reads (`mainMeter` was still the first in the text), and a tap that names the piece's one meter after a second clock is folded away.

A second meter with a tempo of its own is a second degree of freedom in time. Where its tempo doesn't move by itself it is a ratio of the first: three against four, a canon at 4:5:6, a phase at 121 to 120. A common meter, a "gcd", always exists for rates a text writes (each is a decimal or a fraction), and is the wrong one to name: 120 against 121 bpm share 1 bpm, which nobody counts. A ratio goes both ways, so the root is the meter that is counted.

Measured over the 89 examples (#778): 76 have one meter and 8 none; 3 hold a second meter that taps the first; `breve` held a second with a tempo of its own; `daytime` holds four clocks of the wall.

## Decision

1. **A piece has one root meter: the meter with a tempo of its own**, a rate (`step=120bpm`) or a tempo cell's (`step=&tempo`), wherever it is written.
2. **Every other meter is derived from it by a tap**: `&waltz meter("3/4") step=beat/2`, `&clave scan(3 3 4 3 3) step=pulse*5/4`. A step of the tap is a beat of a `meter(…)`, an entry of a `scan(…)`; lines read a derived meter as any meter (#786), and it follows the root's tempo.
3. **A second meter with a tempo of its own is an error on its line**, which writes the tap it is derived by, `step=pulse*n/d`: its beats a second over the root's pulses a second, a fraction of whole numbers. A tempo read from a cell with a ratio (`step=&tempo/2`) is a tempo of its own too.
4. **Migrate writes it** (`migrate/oneroot.ts`, rule `one root`): the first in the text is the root, as the old way read it, and each other's `step=` is its tap, where that plays the same. A second meter left to a slider, or with a swing of its own, keeps its error: the author's.
5. **The clocks of the wall are the environment's**, as `A4` and `SAMPLE_RATE` are: a meter turned by `loop=` (`loop=1d`, `loop=1min`). They are no tempo of the piece's: a tempo moved leaves them, and L14 (time scaling) already leaves them out. A piece may hold any number, beside its root or with none. Where it holds several and no meter of its own, a tap names the one it reads, as 091 rules; that is all that is left of 091's error.
6. **The root is what a host reads**: `CompileResult.mainMeter`. It is the one meter with a tempo of its own, so no order decides it. `CompileResult.meters` lists the clocks of the wall where a piece has several and no root (and, read the old way, the meters Migrate derives).

**Why not** several roots with the host's declared (a word, or the piece's signature): a new form to choose among meters that music writes as ratios of one.
**Why not** the common meter as the root: no one counts it, and it moves when a ratio does.
**Why not** the wall under the same rule: a day at the piece's tempo is no day.

## Consequences

- **A text that compiled is an error** where it holds a second meter with a tempo of its own. Migrate derives it; it plays the same. What changes then is what a tempo moved does: the second follows the root, where it kept its own.
- **Two tempo sliders** are one tempo and one ratio. A ratio left free in a tap's chain is not built yet (#778).
- **`breve`** writes `&sixteenths scan(1 1 1 1) pulse=16n step=pulse*4`; its events don't move, and its live view does (the scan is drawn as a tap of the bar). **`daytime`** is as it is: four clocks of the wall. No seed fragment changes.
- **Normalise** derives a second meter last, after it folds a second clock into the root (#668), as it names a tap's clock last (091).
- **Open:** a ratio left free; a derived meter's own swing and bend; a wall clock derived from another (`&hour step=&minute:1m` plays the same today, and is not asked for).
