---
id: industrial_drums
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

```cells
&kick, &metal, &groove from (&bd, &hh)
&bd, &hh from gm_kit
&kick role=kick step=8n &bd:0:.8 ~ ~ ~ ~ ~ &bd:0:.6 ~
&metal role=hat step=16n ~ ~ &hh:0:.15 ~ ~ ~ ~ &hh:0:.12 ~ ~ ~ &hh:0:.15 ~ ~ ~ ~
&groove [&kick, &metal]
```

The percussion of [Ghost-Cells](../../examples/ghosts.md), made plain: a heavy kick on one and on the seventh eighth, and metal ticks scattered over the sixteenths. The example draws its last kick and its ticks by chance, and adds glitches; here each is where it falls most.

At Dark ambient's point (sync .35, harm .15, bite .4), weight 1, as the facet `rhythm` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `industrial_drums(bd=&mine)`.
