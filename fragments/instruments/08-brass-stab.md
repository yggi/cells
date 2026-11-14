---
id: brass_stab
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 0.125
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

```cells
&keysV s=saw loop=C3 lpf=1800 env=&(map=adsr .01 .12 .25 .1)
```

Electro swing's stabs, a short brassy chord: a saw opened to 1800 Hz, a fast attack and a quick fall to a low sustain, so the Charleston's chords bite and get out of the way.
It defines `&keysV`, the voice the stab performer plays (`use &keysV from keys`), so it fills the same hole as the default `keys`.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s `&keysV` word for word, at the default's register (`loop=C3`), so a stab played on it sends the MIDI notes it sends on `keys`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Funk's and Salsa's points, their horn section's hits.
