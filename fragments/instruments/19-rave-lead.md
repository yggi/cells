---
id: rave_lead
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

```cells
&leadV s=saw loop=C4 lpf=5200 room=.3 env=&(map=adsr .01 .2 .7 .2)
```

The hook's saw of [Hypercell](../../examples/hypercell.md): a bright saw, its filter open, a short room on it. The example plays the hook on two, one detuned a few cents against the other; one is what a voice is.
It defines `&leadV`, the voice the lead performer plays.

Associated at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).
