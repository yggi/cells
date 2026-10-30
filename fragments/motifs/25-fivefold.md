---
id: fivefold
association:
  - point:
      sync: 0.4
      harm: 0.9
      artic: 0.5
      energy: 0.3
    weight: 1
    facet: motif
source: seed
---

```cells
&fivefold from &key
&fivefold over=&key step=8n 0 2 4@4 3 2 1@2
```

Up the triad to the fifth and held, the bar's first three beats, then down by step through its last two: five beats grouped 3 + 2.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 5/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&fivefold`), so `use &fivefold` takes it; a form reads it as its `&call` (`&call step=8n &fivefold`), the line the form moves and answers.

At 5/4's first point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&fivefold from &key`. `&fivefold from fivefold &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &fivefold from fivefold`, it reads `&key` by name, as before.
