---
id: rave_lead
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

```cells
* from style=&happyHardcore * .125
&leadV s=saw loop=C4 lpf=5200 room=.3 env=&(map=adsr .01 .2 .7 .2)
```

The hook's saw of [Hypercell](../../examples/hypercell.md): a bright saw, its filter open, a short room on it. The example plays the hook on two, one detuned a few cents against the other; one is what a voice is.
It defines `&leadV`, the voice the lead performer plays.

Associated at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).
