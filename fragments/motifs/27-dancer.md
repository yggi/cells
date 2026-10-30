---
id: dancer
association:
  - point:
      sync: 0.6
      harm: 0.9
      artic: 0.8
      energy: 0.9
    weight: 1
    facet: motif
source: seed
---

```cells
&dancer from &key
&dancer over=&key step=8n 0 ~ 2 4 ~ 5 4 2 1 0
```

Ten eighths as 3 + 3 + 2 + 2: a leap up to the sixth in the threes, then stepping home in the twos.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 10/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&dancer`), so `use &dancer` takes it; a form reads it as its `&call` (`&call step=8n &dancer`), the line the form moves and answers.

At 10/8's point (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&dancer from &key`. `&dancer from dancer &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &dancer from dancer`, it reads `&key` by name, as before.
