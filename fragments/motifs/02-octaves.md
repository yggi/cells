---
id: octaves
association:
  - point:
      sync: 0.12
      harm: 0
      artic: 1
      energy: 0.8
    weight: 1
    facet: motif
source: seed
---

```cells
&octaves over=&key step=8n 0 ~ 7 ~ 0 0 ~ 7
```

The tonic and its octave, struck short on and off the beat: the line a techno track rides a filter over, its pitch all in two notes. Written by hand for Techno, where the harmony stands still and every note is staccato.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&octaves`), so `use &octaves` takes it; a form reads it as its `&call` (`&call step=8n &octaves`), the line the form moves and answers.

At Techno's point (`presets.ts`), weight 1, as the facet `motif`.
