---
id: melodie
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.75
      mood: 0.45
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

```cells
&melodie from &key
&melodie over=&key step=8n 4@2 2 1 0@4
```

The melody of [Zelluläre Aktivität](../../examples/zell.md), its first bar: the fifth held, down by step to the tonic, held half the bar, plain over the arpeggio.

Near Elektro's point, 0.1 lower in bite (sync .15, harm .5, bite .75, mood .45), weight 1, as the facet `motif`, so a query there finds `sequencer` first and this one 0.05 away (#572).
