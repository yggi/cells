---
id: brass_band
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.8
      mood: 0.75
    weight: 0.5
    facet: instrument
source: seed
---

```cells
&leadV s=saw loop=C4 lpf=2000 lpq=2 env=&(map=adsr .03 .1 .8 .1)
```

A brass band's cornet: a saw through a filter half open, its attack a breath slower than a stab's, held for the march's tune.
It defines `&leadV`, the voice the lead performer plays.

At March's point (sync 0, harm 0.1, bite 0.75, mood 0.7), weight 0.125, as the facet `instrument` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Salsa's point, a second lead behind the montuno piano.
