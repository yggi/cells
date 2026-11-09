---
id: chip_drums
association:
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

```cells
&kick step=2n &bd:0:.6
&hats step=8n &hh:0:.5 &hh:0:.15 &hh &hh:0:.15 &hh:0:.5 &hh:0:.15 &hh &hh:0:.15
&groove [&kick, &hats]
```

The drums of [Korobeiniki](../../examples/korobeiniki.md): its noise channel's hats, loud on the beat and soft between, with a kick under one and three.

At Chiptune's point (sync 0.3, harm 0.7, bite 1), weight 1, as the facet `rhythm` (#542).
