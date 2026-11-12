---
id: square_bass
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

```cells
&bassV s=square loop=C2 lpf=600 env=&(map=adsr .005 .15 .5 .05)
```

The bass of [Zelluläre Aktivität](../../examples/zell.md): a square through a closed low-pass, struck and held at half, the machine bass of German electronic music of the late 1970s.
It defines `&bassV`, the voice the bass performer plays, at the default bass's register (`loop=C2`; the example's sits a third lower, on A1).

Associated at Elektro's point (sync .15, harm .5, bite .85, mood .45) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): on Chiptune's point, a sound chip's square bass.
