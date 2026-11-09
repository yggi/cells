---
id: acid_drums
association:
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

```cells
&kick step=4n &bd:0:.8
&clap step=2n [~ &cp:0:.35]
&hat step=8n [&hh:0:.3 &oh:0:.5]
&groove [&kick, &clap, &hat]
```

The beat of [Acid-Cell](../../examples/acid.md): the kick on every beat, the clap on two and four, the closed hat on the beat and the open hat on the and.

At Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet `rhythm` (#572).
