---
id: square_bass
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

```cells
* from style=(&elektro * .125 | &chiptune * .125)
&bassV s=square loop=C2 lpf=600 env=&(map=adsr .005 .15 .5 .05)
```

The bass of [Zelluläre Aktivität](../../examples/zell.md): a square through a closed low-pass, struck and held at half, the machine bass of German electronic music of the late 1970s.
It defines `&bassV`, the voice the bass performer plays, at the default bass's register (`loop=C2`; the example's sits a third lower, on A1).

Associated at Elektro's point (sync .15, harm .5, bite .85, mood .45) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): on Chiptune's point, a sound chip's square bass.
