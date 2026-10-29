---
id: organ
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/spooky.md @ 6d1bfa7
---

```cells
&padV s=square loop=C3 lpf=1100 env=&(map=adsr .25 .2 .8 .6)
```

Spooky's pad, a church organ in an empty nave: a square, the reedy stop, filtered to 1100 Hz, swelling in over a quarter of a second and hanging on after the chord is let go.
It defines `&padV`, the voice the pad performer plays (`use &padV from pad`), so it fills the same hole as the default `pad`.
It is [Spooky, in pieces](../../examples/spooky.md)'s `&padV` word for word, at the default's register (`loop=C3`), so a chord played on it sends the MIDI notes it sends on `pad`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (`SPOOKY`: sync .2, harm .9, artic .3, energy .35; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
