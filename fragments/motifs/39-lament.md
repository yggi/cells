---
id: lament
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.25
      energy: 0.3
    weight: 1
    facet: motif
source: seed
---

```cells
&lament from &key
&lament over=&key step=8n 4 3# 3 2# 2 1 0@2
```

A chromatic descent from the fifth to the tonic, semitone by semitone where the key allows (A G♯ G F♯ F E D in D harmonic minor): the lament's falling line, made to creep.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&lament`), so `use &lament` takes it; a form reads it as its `&call` (`&call step=8n &lament`), the line the form moves and answers.
Near Spooky's point (sync .2, harm .9, artic .3, energy .35; yggi/jambot#517), 0.05 lower in artic and energy, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.

**Its signature** (decision 065): `&lament from &key`. `&lament from lament &key` takes a copy of it, `&key` its main argument.
