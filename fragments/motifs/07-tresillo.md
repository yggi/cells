---
id: tresillo
association:
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: motif
source: seed
---

```cells
&tresillo from &key
&tresillo over=&key step=&(even(3, 8, 2) step=1m*3):pulse 4 2 0
```

The fifth, the third and the tonic falling on the tresillo's 3 + 3 + 2. Written by hand for Bossa nova, its melody on the clave's long-long-short.
Its durations, 3 3 2 eighths, are `even(3, 8, 2)`, three as even as three go over eight (decision 072; `even.test.ts`), and it is written so: it taps that table stepped over the bar (`step=&(even(3, 8, 2) step=1m*3):pulse`), each note as long as its interval (#531). The cinquillo is its five, `even(5, 8, 2)`.
It is a line of degrees of the key (`over=&key`), one bar of 4/4: its hole is `&key`, and its table taps the host's bar (`step=1m*3`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&tresillo`), so `use &tresillo` takes it; a form reads it as its `&call` (`&call step=8n &tresillo`), the line the form moves and answers.

At Bossa nova's point (`styles`), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&tresillo from &key`. `&tresillo from tresillo &key` takes a copy of it, `&key` its main argument.
