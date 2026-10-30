---
id: sigh
association:
  - point:
      sync: 0.35
      harm: 0.55
      artic: 0.65
      energy: 0.65
    weight: 1
    facet: motif
source: seed
---

```cells
&sigh from &key
&sigh over=&key step=8n 4@3 3 2@2 ~ ~
```

A sigh: the fifth held, falling by step to the third and held again, then two beats of air. Written by hand for Deep house's dorian, a vocal hook's shape over a vamp.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&sigh`), so `use &sigh` takes it; a form reads it as its `&call` (`&call step=8n &sigh`), the line the form moves and answers.

At Deep house's point (`presets.ts`), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&sigh from &key`. `&sigh from sigh &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &sigh from sigh`, it reads `&key` by name, as before.
