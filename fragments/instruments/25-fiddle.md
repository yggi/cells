---
id: fiddle
association:
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

```cells
&leadV s=saw loop=C4 lpf=3000 env=&(map=adsr .01 .15 .5 .1)
```

The fiddle of [Drunken Sailor](../../examples/sailor.md): a bright saw bowed short, at the default lead's register (`loop=C4`; the example plays it an octave up).
It defines `&leadV`, the voice the lead performer plays.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #542).
