---
id: happy_hardcore_drums
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

```cells
&kick, &clap, &hat, &groove from (&bd, &cp, &hh)
&bd, &cp, &hh from gm_kit
&kick role=kick step=4n &bd:0:.8
&clap role=backbeat step=2n [~ &cp:0:.35]
&hat role=hat step=8n [~ &hh:0:.2]
&groove [&kick, &clap, &hat]
```

The beat of [Hypercell](../../examples/hypercell.md): four on the floor, the clap on two and four, the closed hat between the kicks.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1, as the facet `rhythm` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&cp`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &cp, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `happy_hardcore_drums(bd=&mine)`.
