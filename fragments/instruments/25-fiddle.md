---
id: fiddle
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

```cells
* from style=(&seaShanty * .125 | &(map=style sync=0 harm=.7 bite=.4 mood=.9) * .5)
&leadV s=saw loop=C4 lpf=3000 env=&(map=adsr .01 .15 .5 .1)
```

The fiddle of [Drunken Sailor](../../examples/sailor.md): a bright saw bowed short, at the default lead's register (`loop=C4`; the example plays it an octave up).
It defines `&leadV`, the voice the lead performer plays.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #542).

**Shared** (#540): near Waltz's point, a second lead behind the accordion.
