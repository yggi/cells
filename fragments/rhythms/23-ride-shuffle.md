---
id: ride_shuffle
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

```cells
&ride step=8n &rd:0:.9 ~ &rd:0:.6 &rd:0:.5 &rd:0:.9 ~ &rd:0:.6 &rd:0:.5
&kick step=2n &bd:0:.5
&groove [&ride, &kick]
```

The ride of [Swing blues](../../examples/jazz.md): ding, ding-a ding, ding-a, on a swung meter the long and the short of each beat, a light kick under one and three.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45), weight 1, as the facet `rhythm` (#542).
