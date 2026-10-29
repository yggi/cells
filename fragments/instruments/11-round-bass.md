---
id: round bass
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
&bassV s=tri loop=C2 lpf=500 env=&(map=adsr .01 .3 .6 .2)
```

Spooky's bass, soft and round under the creep: a triangle closed down to 500 Hz, with a held sustain and a slow release, so the root and the semitone above it blur into each other.
It defines `&bassV`, the voice the bass performer plays (`use &bassV from bass`), so it fills the same hole as the default `bass`.
It is [Spooky, in pieces](../../examples/spooky.md)'s `&bassV` but for its register: `loop=C2`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on `bass` (the example's `loop=C3` is the piece's own).
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (`SPOOKY`: sync .2, harm .9, artic .3, energy .35; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
