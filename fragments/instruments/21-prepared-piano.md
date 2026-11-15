---
id: prepared_piano
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

```cells
* from style=&darkAmbient * .125
&leadV s=tri loop=C4 lpf=3000 room=.45 env=&(map=adsr .002 1.6 0 1.8) pitch=&(map=lin loop=.19 0 .05 0 -.05 0)
```

The piano of [Ghost-Cells](../../examples/ghosts.md): a triangle struck at once and left to ring for two seconds and more, its pitch wavering a twentieth of a semitone either way, a prepared piano heard in a large room.
It defines `&leadV`, the voice the lead performer plays, at the default lead's register (`loop=C4`; the example plays it on D4 and panned, with an echo in time).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).
