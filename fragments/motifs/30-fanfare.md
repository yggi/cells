---
id: fanfare
association:
  - point:
      sync: 0.2
      harm: 0.6
      artic: 0.9
      energy: 1
    weight: 1
    facet: motif
source: seed
---

```cells
&fanfare from &key
&fanfare over=&key step=8n 0 0 0 2@2 4@2 ~
```

The tonic three times, then the third and the fifth held: a fanfare's call, in two half-note beats.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4 alla breve: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&fanfare`), so `use &fanfare` takes it; a form reads it as its `&call` (`&call step=8n &fanfare`), the line the form moves and answers.

At 4/4 alla breve's point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&fanfare from &key`. `&fanfare from fanfare &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &fanfare from fanfare`, it reads `&key` by name, as before.
