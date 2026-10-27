---
id: bebop
association:
  - point:
      sync: 0.35
      harm: 1
      artic: 0.3
      energy: 0.6
    weight: 1
    facet: motif
source: seed
---

```cells
&bebop over=&key step=8n 0 2 4 6 7@2 6 4
```

Up the seventh chord to the octave, held, and back down through the seventh: a bebop arpeggio. Written by hand for Swing jazz, where the harmony moves most.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&bebop`), so `use &bebop` takes it; a form reads it as its `&call` (`&call step=8n &bebop`), the line the form moves and answers.

At Swing jazz's point (`presets.ts`), weight 1, as the facet `motif`.
