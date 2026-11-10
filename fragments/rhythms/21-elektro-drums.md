---
id: elektro_drums
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

```cells
&kick, &backbeat, &tick, &groove from (&bd, &sd, &hh)
&bd, &sd, &hh from gm_kit
&kick step=2n &bd:0:.8
&backbeat step=2n [~ &sd:0:.35]
&tick step=8n &hh:0:.12
&groove [&kick, &backbeat, &tick]
```

The beat of [Zelluläre Aktivität](../../examples/zell.md): the kick on one and three, the snare on two and four, a light metallic tick on every eighth.

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet `rhythm` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `elektro_drums(bd=&mine)`.
