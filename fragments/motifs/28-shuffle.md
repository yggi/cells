---
id: shuffle
association:
  - point:
      sync: 0.7
      harm: 0.6
      artic: 0
      energy: 0.2
    weight: 1
    facet: motif
source: seed
---

```cells
&shuffle from &key
&shuffle over=&key step=8n 0@2 2 3@2 4 4@2 2 0@2 ~
```

Long, short four times over the bar's four beats: the tonic, the third, the fourth, the fifth and back, a slow blues shuffle in 12/8.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 12/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&shuffle`), so `use &shuffle` takes it; a form reads it as its `&call` (`&call step=8n &shuffle`), the line the form moves and answers.

At 12/8's point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&shuffle from &key`. `&shuffle from shuffle &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &shuffle from shuffle`, it reads `&key` by name, as before.
