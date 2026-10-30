---
id: limp
association:
  - point:
      sync: 0.8
      harm: 0.6
      artic: 1
      energy: 1
    weight: 1
    facet: motif
source: seed
---

```cells
&limp from &key
&limp over=&key step=8n 0 ~ 4 ~ 3 2 0
```

The tonic, the fifth, then a run down to the tonic: short notes in 7/8's 2 + 2 + 3, the last group the long one.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 7/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&limp`), so `use &limp` takes it; a form reads it as its `&call` (`&call step=8n &limp`), the line the form moves and answers.

At 7/8's point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&limp from &key`. `&limp from limp &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &limp from limp`, it reads `&key` by name, as before.
