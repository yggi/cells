---
id: montuno_piano
source: seed
---

```cells
* from style=(&salsa * .125 | &(map=style sync=.75 harm=.85 bite=.55 mood=.9) * .5)
&leadV s=square loop=C4 lpf=2800 env=&(map=adsr .002 .3 .15 .2)
```

A bright, struck piano for the montuno: a square wave through an open filter, quick to start and quick to fade.
It defines `&leadV`, the voice the lead performer plays.

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 0.125, as the facet `instrument` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Bossa nova's point, a second lead behind the default.
