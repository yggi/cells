---
id: shanty_drums
association:
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

```cells
&kick step=2n &bd:0:.8
&snare step=2n [~ &sd:0:.5]
&hat step=8n [~ &hh:0:.3]
&groove [&kick, &snare, &hat]
```

The kit of [Drunken Sailor](../../examples/sailor.md): the kick on one and three, the snare on two and four, the hat on every offbeat eighth.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7), weight 1, as the facet `rhythm` (#542).
