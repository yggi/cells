---
id: chip_drums
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

```cells
&kick, &hats, &groove from (&bd, &hh) style=&(map=style sync=.3 harm=.7 bite=1)
&bd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.6
&hats step=8n &hh:0:.5 &hh:0:.15 &hh &hh:0:.15 &hh:0:.5 &hh:0:.15 &hh &hh:0:.15
&groove [&kick, &hats]
```

The drums of [Korobeiniki](../../examples/korobeiniki.md): its noise channel's hats, loud on the beat and soft between, with a kick under one and three.

At Chiptune's point (sync 0.3, harm 0.7, bite 1), weight 1, as the facet `rhythm` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `chip_drums(bd=&mine)`.
