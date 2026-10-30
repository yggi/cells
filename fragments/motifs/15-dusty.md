---
id: dusty
association:
  - point:
      sync: 0.5
      harm: 0.75
      artic: 0.35
      energy: 0.6
    weight: 1
    facet: motif
source: seed
---

```cells
&dusty from &key
&dusty over=&key step=8n ~ 0 2 ~ 4 2@3
```

Late in on the tonic, up through the third to the fifth and back to the third, held to the bar's end: a line that sits behind the beat. Written by hand for Lo-fi hip hop's minor and its swung eighths.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&dusty`), so `use &dusty` takes it; a form reads it as its `&call` (`&call step=8n &dusty`), the line the form moves and answers.

Near Lo-fi hip hop's point, 0.1 higher in energy, so a query there finds `lazy` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&dusty from &key`. `&dusty from dusty &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &dusty from dusty`, it reads `&key` by name, as before.
