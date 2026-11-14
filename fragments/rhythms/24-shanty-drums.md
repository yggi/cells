---
id: shanty_drums
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

```cells
&kick, &snare, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.1 harm=.25 bite=.7)
&bd, &sd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.8
&snare step=2n [~ &sd:0:.5]
&hat role=hat step=8n [~ &hh:0:.3]
&groove [&kick, &snare, &hat]
```

The kit of [Drunken Sailor](../../examples/sailor.md): the kick on one and three, the snare on two and four, the hat on every offbeat eighth.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7), weight 1, as the facet `rhythm` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `shanty_drums(bd=&mine)`.
