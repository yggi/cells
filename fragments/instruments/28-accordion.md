---
id: accordion
source: seed
---

```cells
* from style=(&waltz * .125 | &(map=style sync=.1 harm=.25 bite=.8 mood=.65) * .5)
&leadV s=square loop=C4 lpf=2200 env=&(map=adsr .03 .1 .9 .15) pitch=&(map=lin loop=6 0 .06 0 -.06 0)
```

A musette accordion: a reedy square, held while the bellows push, with the slight beating of its detuned reeds as a shallow vibrato.
It defines `&leadV`, the voice the lead performer plays.

At Waltz's point (sync 0, harm 0.7, bite 0.3, mood 0.9), weight 0.125, as the facet `instrument` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Sea shanty's point, a second lead behind the fiddle.
