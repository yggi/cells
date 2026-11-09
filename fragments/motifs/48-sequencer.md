---
id: sequencer
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

```cells
&sequencer from &key
&sequencer over=&key step=8n 0 2 4 7 0 2 4 7
```

The sequencer arpeggio of [Zelluläre Aktivität](../../examples/zell.md): the triad and its octave, up, twice a bar in eighths, the sequencer's figure (the example runs it in sixteenths, four times a bar; a motif is a bar of eighths, as every form reads it).

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet `motif` (#572).
