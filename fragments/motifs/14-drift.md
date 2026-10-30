---
id: drift
association:
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.3
    weight: 1
    facet: motif
source: seed
---

```cells
&drift from &key
&drift over=&key step=8n 4@4 3@4
```

Two notes, the fifth and the fourth, half a bar each: a line that barely moves, legato and sparse. Written by hand for Ambient.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&drift`), so `use &drift` takes it; a form reads it as its `&call` (`&call step=8n &drift`), the line the form moves and answers.

Near Ambient's point, 0.1 higher in energy, so a query there finds `rising` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&drift from &key`. `&drift from drift &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &drift from drift`, it reads `&key` by name, as before.
