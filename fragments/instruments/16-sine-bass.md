---
id: sine_bass
association:
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/kinderlied.md @ a8de625f
---

```cells
&bassV s=sine loop=C2 env=&(map=adsr .005 .4 .4 .1)
```

The round, soft bass of [Kinderlieder, in pieces](../../examples/kinderlied.md): a sine struck at once, falling to under half in four tenths of a second, as a toy piano's left hand, at the default bass's register (`loop=C2`; the example plays it an octave up), so it sends the MIDI notes `bass` sends.
It defines `&bassV`, the voice the bass performer plays, so it fills the same hole as the default `bass`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet `instrument`, at half the default instruments' weight (0.125), as Spooky's and Electro swing's own are (#350), so a query for an instrument finds it first there (#572).
