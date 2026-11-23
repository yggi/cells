---
id: metric_accent
runtime: builtin
source: seed
---

```cells
&accent from (&steps, &density, &sync, &peak, &floor)
&accent map=amp step=16n fill()
&steps 16
&density 1
&sync 0
&peak .8
&floor .2
```

A bar's accents from its metric weights (#799): a line of levels a role multiplies its hits by, the downbeat strongest, then the half bar, the beats and the finest steps (`&euclid * &euclidLevel`). **A built-in plugin-fragment** (decision 085, 090): its one fill is a braid, answered once when a `from` line takes it, so the piece's copy holds the levels as written (`src/engine/accent.ts`, `runtime: builtin`).

Its arguments: `steps`, the steps of a bar (16, sixteenths of 4/4; 12 for a bar of four beats of three); `density`, 0 to 1, which steps play (1 every one, 0 the downbeat alone); `sync`, 0 to 1, how far each step leans toward the weight of the step after it (an anticipation); and `peak` and `floor`, the downbeat's level and the lightest step's. A bar of 16 at the defaults is `.8 .32 .44 .32 .56 .32 .44 .32 .68 .32 .44 .32 .56 .32 .44 .32`. Its fuel is 64 steps.

It has no style: a bar's weights are every style's, so no query finds it, and a fragment takes it by its name (decision 090), as the funk, lo-fi and bossa grooves take their euclid's levels: `&euclidLevel from metric_accent(floor=.23, peak=.3)`.
