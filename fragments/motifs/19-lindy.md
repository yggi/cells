---
id: lindy
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.85
    weight: 1
    facet: motif
source: seed
---

```cells
&lindy from &key
&lindy over=&key step=8n 0@3 4@3 2@2
```

The tonic, the fifth and the third on the Charleston's 3 + 3 + 2, as a Lindy hop dances it: the swing era's dance, which electro swing samples. Written by hand for Electro swing's harmonic minor.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&lindy`), so `use &lindy` takes it; a form reads it as its `&call` (`&call step=8n &lindy`), the line the form moves and answers.

Near Electro swing's point, 0.1 higher in energy, so a query there finds `gypsy` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&lindy from &key`. `&lindy from lindy &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &lindy from lindy`, it reads `&key` by name, as before.
