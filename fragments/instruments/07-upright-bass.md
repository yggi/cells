---
id: upright bass
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

```cells
&bassV s=saw loop=C2 lpf=700 env=&(map=adsr .005 .3 .25 .08)
```

Electro swing's bass, plucked and dark: a saw closed down to 700 Hz with a short decay and a low sustain, so each note thumps and fades as a slapped string does.
It defines `&bassV`, the voice the bass performer plays (`use &bassV from bass`), so it fills the same hole as the default `bass` and can stand in for it.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s `&bassV` but for its register: `loop=C2`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on `bass` (the example's `loop=C3` is the piece's own).
It sounds within the renderer's first stage (decision 062, R1): a wave, a low-pass filter and an envelope.

Associated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, artic .6, energy .75; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
