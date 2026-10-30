---
id: lazy
association:
  - point:
      sync: 0.5
      harm: 0.75
      artic: 0.35
      energy: 0.5
    weight: 1
    facet: motif
source: seed
---

```cells
&lazy from &key
&lazy over=&key step=8n ~ 2 4 ~ 3@2 2 0
```

Late in, up to the fifth, then down by step to the tonic, the fourth held: a lazy line behind the beat. Written by hand for Lo-fi hip hop's minor, its swung eighths.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&lazy`), so `use &lazy` takes it; a form reads it as its `&call` (`&call step=8n &lazy`), the line the form moves and answers.

At Lo-fi hip hop's point (`presets.ts`), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&lazy from &key`. `&lazy from lazy &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &lazy from lazy`, it reads `&key` by name, as before.
