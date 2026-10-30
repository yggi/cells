---
id: tresillo
association:
  - point:
      sync: 0.75
      harm: 0.85
      artic: 0.45
      energy: 0.45
    weight: 1
    facet: motif
source: seed
---

```cells
&tresillo from &key
&tresillo over=&key step=8n 4@3 2@3 0@2
```

The fifth, the third and the tonic falling on the tresillo's 3 + 3 + 2. Written by hand for Bossa nova, its melody on the clave's long-long-short.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&tresillo`), so `use &tresillo` takes it; a form reads it as its `&call` (`&call step=8n &tresillo`), the line the form moves and answers.

At Bossa nova's point (`presets.ts`), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&tresillo from &key`. `&tresillo from tresillo &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &tresillo from tresillo`, it reads `&key` by name, as before.
