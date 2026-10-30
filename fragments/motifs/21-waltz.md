---
id: waltz
association:
  - point:
      sync: 0
      harm: 0.7
      artic: 0.3
      energy: 0
    weight: 1
    facet: motif
source: seed
---

```cells
&waltz from &key
&waltz over=&key step=8n 0@2 2 4 4@2
```

The tonic held on the downbeat, then the third and the fifth, the fifth held into the next bar: a waltz's long first beat and its two light ones.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 3/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&waltz`), so `use &waltz` takes it; a form reads it as its `&call` (`&call step=8n &waltz`), the line the form moves and answers.

At 3/4's first point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&waltz from &key`. `&waltz from waltz &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &waltz from waltz`, it reads `&key` by name, as before.
