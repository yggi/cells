---
id: rocking
association:
  - point:
      sync: 0.3
      harm: 0.2
      artic: 0.2
      energy: 0
    weight: 1
    facet: motif
source: seed
---

```cells
&rocking from &key
&rocking over=&key step=8n 0@2 2 4@2 2
```

Long, short, long, short: a cradle's rock in two groups of three, from the tonic to the fifth and back to the third.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 6/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&rocking`), so `use &rocking` takes it; a form reads it as its `&call` (`&call step=8n &rocking`), the line the form moves and answers.

At 6/8's first point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&rocking from &key`. `&rocking from rocking &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &rocking from rocking`, it reads `&key` by name, as before.
