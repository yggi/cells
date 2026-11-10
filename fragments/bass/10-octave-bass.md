---
id: octave_bass
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: bass
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 1
    facet: bass
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

```cells
&bassline from &harm
&bassline over=&harm step=8n 0 3 0 3 0 3 0 3
```

The bass of [Zelluläre Aktivität](../../examples/zell.md): the root of the chord in force and its octave, eighth by eighth (`3`, a triad's fourth tone, is its root an octave up).
It is the part the bass performer plays (`&bassline`, decision 058).

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet `bass` (#572).
