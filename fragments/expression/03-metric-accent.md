---
id: metric_accent
runtime: builtin
source: seed
---

```cells
&accent from (&steps, &density, &sync, &peak, &floor, &meter)
&accent map=amp step=16n fill()
&steps 0
&density 1
&sync 0
&peak .8
&floor .2
&meter 4/4
```

A bar's accents from its metric weights (#799): a line of levels a role multiplies its hits by, the downbeat strongest, then the half bar, the beats and the finest steps (`&euclid * &euclidLevel`). **A built-in plugin-fragment** (decision 085, 090): its one fill is a braid, answered once when a `from` line takes it, so the piece's copy holds the levels as written (`src/engine/accent.ts`, `runtime: builtin`).

**Its weights are the bar's meter's** (#906): its grades, one a step, as the family's meter contract writes them (yggi/music-commons `contracts/meter`, version 2), each weighed by how high it stands: the downbeat 1, a group's or the half bar's start .8, a beat between .6, an eighth .4, a sixteenth .2. So 3/4 stresses its beats, 6/8 its two dotted quarters, 7/8 its groups (3+2+2), and 5/4 its 3+2.

Its arguments: `meter`, the bar's meter, a signature or sizes (`3/4`, `7/8`, `2+2+3`), 4/4 by default, or the piece's own meter cell, `metric_accent(meter=&bar)`, handed as its levels, so the accents follow whatever meter the piece writes; `steps`, the steps of a bar, 0 by default, a sixteenth a step (16 in 4/4, 12 in 3/4, 14 in 7/8), any other count a whole number of steps a pulse; `density`, 0 to 1, which steps play (1 every one, 0 the downbeat alone); `sync`, 0 to 1, how far each step leans toward the weight of the step after it (an anticipation); and `peak` and `floor`, the downbeat's level and the lightest step's. A bar of 4/4 at the defaults is `.8 .32 .44 .32 .56 .32 .44 .32 .68 .32 .44 .32 .56 .32 .44 .32`, as it was before it read the meter. Its fuel is 64 steps.

It has no style: a bar's weights are every style's, so no query finds it, and a fragment takes it by its name (decision 090), as the funk, lo-fi and bossa grooves take their euclid's levels: `&euclidLevel from metric_accent(floor=.23, peak=.3)`.
