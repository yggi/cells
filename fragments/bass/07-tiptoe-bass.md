---
id: tiptoe_bass
source: seed
---

```cells
&bassline from &harm style=&(map=style sync=.2 harm=.9 bite=.25 mood=.3)
&bassline over=&harm step=4n 0 ~ -1 ~
```

A bass on tiptoe: the root of the chord in force, a beat's silence, the fifth below it, and silence again, plucked short, as a cartoon villain sneaks down a corridor.
Its line reads the host's `&harm` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the root landing on a different beat each time round, as `creeping_bass` does.
Near Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite, weight 1, as the facet `bass`: what the bass plays when `creeping_bass` has tired.

**Its signature** (decision 065): `&bassline from &harm`. `&bassline from tiptoe_bass &harm` takes a copy of it, `&harm` its main argument.
