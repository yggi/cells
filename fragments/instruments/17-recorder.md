---
id: recorder
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
&leadV s=tri loop=C4 env=&(map=adsr .005 .3 .3 .2)
```

The lead of [Kinderlieder, in pieces](../../examples/kinderlied.md): a triangle, plain and breathy, a child's recorder, at the default lead's register (`loop=C4`; the example plays it an octave up), so it sends the MIDI notes `lead` sends.
It defines `&leadV`, the voice the lead performer plays, so it fills the same hole as the default `lead`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).
