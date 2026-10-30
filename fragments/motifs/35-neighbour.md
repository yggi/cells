---
id: neighbour
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.3
      energy: 0.5
    weight: 1
    facet: motif
source: seed
---

```cells
&neighbour from &key
&neighbour over=&key step=8n 0 1 0 -1 0@4
```

The tonic, the note above, the tonic, the note below, and the tonic held: the neighbour notes round one pitch. General-purpose, legato.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&neighbour`), so `use &neighbour` takes it; a form reads it as its `&call` (`&call step=8n &neighbour`), the line the form moves and answers.

At the centre, 0.2 lower in articulation (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&neighbour from &key`. `&neighbour from neighbour &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &neighbour from neighbour`, it reads `&key` by name, as before.
