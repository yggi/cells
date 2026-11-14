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
&kick, &clap, &hat, &groove from (&bd, &cp, &hh, &oh)
&bd, &cp, &hh, &oh from gm_kit
&kick role=kick step=4n &bd:0:.8
&clap role=backbeat step=2n [~ &cp:0:.35]
&hat role=hat step=8n [&hh:0:.3 &oh:0:.5]
&groove [&kick, &clap, &hat]
```

The beat of [Acid-Cell](../../examples/acid.md): the kick on every beat, the clap on two and four, the closed hat on the beat and the open hat on the and.

At Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet `rhythm` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&cp`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &cp, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `acid_drums(bd=&mine)`.
