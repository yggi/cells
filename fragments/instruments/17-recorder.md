---
id: recorder
source: seed
lifted: yggi/cells examples/kinderlied.md @ a8de625f
---

```cells
* from style=(&kinderlied * .125 | &(map=style sync=.15 harm=.8 bite=.6 mood=.85) * .5)
&leadV s=tri loop=C4 env=&(map=adsr .005 .3 .3 .2)
```

The lead of [Kinderlieder, in pieces](../../examples/kinderlied.md): a triangle, plain and breathy, a child's recorder, at the default lead's register (`loop=C4`; the example plays it an octave up), so it sends the MIDI notes `lead` sends.
It defines `&leadV`, the voice the lead performer plays, so it fills the same hole as the default `lead`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): near Baroque's point, a second lead behind the moog.
