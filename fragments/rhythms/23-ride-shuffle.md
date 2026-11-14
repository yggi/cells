---
id: ride_shuffle
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

```cells
&ride, &kick, &groove from (&bd, &rd) style=&(map=style sync=.65 harm=.55 bite=.45)
&bd, &rd from gm_kit
&ride step=8n &rd:0:.9 ~ &rd:0:.6 &rd:0:.5 &rd:0:.9 ~ &rd:0:.6 &rd:0:.5
&kick role=kick step=2n &bd:0:.5
&groove [&ride, &kick]
```

The ride of [Swing blues](../../examples/jazz.md): ding, ding-a ding, ding-a, on a swung meter the long and the short of each beat, a light kick under one and three.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45), weight 1, as the facet `rhythm` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&ride2=ride`), and passes its own drum where it has one: `ride_shuffle(bd=&mine)`.
