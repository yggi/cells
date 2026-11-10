---
id: march
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.6
      mood: 0.45
    weight: 1
    facet: motif
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: motif
source: seed
---

```cells
&march from &key
&march over=&key step=8n 4 4 0 ~
```

The fifth twice, then the tonic, and a rest: a march's call, two beats to the bar.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 2/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&march`), so `use &march` takes it; a form reads it as its `&call` (`&call step=8n &march`), the line the form moves and answers.

At 2/4's point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&march from &key`. `&march from march &key` takes a copy of it, `&key` its main argument.

**At March's point too** (#542), weight 1, so the style finds it first.
