---
id: guajeo
association:
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 1
    facet: motif
source: seed
---

```cells
&guajeo from &key
&guajeo over=&key step=8n ~ 2 4 ~ 2 4 ~ 7
```

A guajeo, the piano's ostinato in a montuno: the third and the fifth off the beat, twice, and the octave on the last off-beat, every downbeat left out.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&guajeo`), so `use &guajeo` takes it; a form reads it as its `&call` (`&call step=8n &guajeo`), the line the form moves and answers.

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 1, as the facet `motif` (#542).

**Its signature** (decision 065): `&guajeo from &key`. `&guajeo from guajeo &key` takes a copy of it, `&key` its main argument.
