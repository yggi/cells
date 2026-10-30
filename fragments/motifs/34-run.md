---
id: run
association:
  - point:
      sync: 0.5
      harm: 0.7
      artic: 0.5
      energy: 0.5
    weight: 1
    facet: motif
source: seed
---

```cells
&run over=&key step=8n 0 1 2 3 4 5 6 7
```

The scale from the tonic to the octave, one note an eighth: in each mode it walks that mode. General-purpose, for richer harmony.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&run`), so `use &run` takes it; a form reads it as its `&call` (`&call step=8n &run`), the line the form moves and answers.

At the centre, 0.2 higher in harmony (#369), weight 1, as the facet `motif`.
