---
id: musicBox
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.43
    weight: 1
    facet: motif
source: seed
---

```cells
&musicBox from &key
&musicBox over=&key step=8n 4 3 4 1 2@2
```

The fifth, the fourth and the fifth again, then down to the second and the third held: a music box running down, in three. Near Spooky, where 3/4 is found.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 3/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&musicBox`), so `use &musicBox` takes it; a form reads it as its `&call` (`&call step=8n &musicBox`), the line the form moves and answers.

At 3/4's point near Spooky (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&musicBox from &key`. `&musicBox from musicBox &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &musicBox from musicBox`, it reads `&key` by name, as before.
