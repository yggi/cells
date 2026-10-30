---
id: rising
association:
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.2
    weight: 1
    facet: motif
source: seed
---

```cells
&rising from &key
&rising over=&key step=8n 0@2 2@2 4@4
```

The triad rising slowly, tonic, third, fifth, the last held half the bar: the owner's own example of a motif's name (#288). Written by hand for Ambient, legato and sparse.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&rising`), so `use &rising` takes it; a form reads it as its `&call` (`&call step=8n &rising`), the line the form moves and answers.

At Ambient's point (`presets.ts`), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&rising from &key`. `&rising from rising &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &rising from rising`, it reads `&key` by name, as before.
