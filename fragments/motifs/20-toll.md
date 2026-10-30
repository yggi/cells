---
id: toll
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.45
    weight: 1
    facet: motif
source: seed
---

```cells
&toll from &key
&toll over=&key step=8n 0@4 -3@4
```

A bell tolling: the tonic, then the fifth below, half a bar each. Written by hand for Spooky, the knell before the chant.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&toll`), so `use &toll` takes it; a form reads it as its `&call` (`&call step=8n &toll`), the line the form moves and answers.

Near Spooky's point, 0.1 higher in energy, so a query there finds `diesIrae` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&toll from &key`. `&toll from toll &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &toll from toll`, it reads `&key` by name, as before.
