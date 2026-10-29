---
id: muted trumpet
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
&leadV s=saw loop=C4 lpf=1400 lpq=6 env=&(map=adsr .03 .1 .6 .12) pitch=&(map=lin loop=4.5 0 .08 0 -.08 0)
```

Electro swing's second lead, the trumpet with a mute in it: a saw through a resonant low-pass (1400 Hz, `lpq=6`), the mute's nasal peak, with a slower, narrower vibrato than the clarinet's.
It defines `&leadV`, the voice the lead performer plays, so it is the other instrument a lead player at this point may take; at the point the two are equally near, and a query lists the clarinet first, by id. A piece with both, as the example, gives the second player a voice of its own.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s `&trumpetV`, named for the hole it fills, at the default lead's register (`loop=C4`), so a line played on it sends the MIDI notes it sends on `lead`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, artic .6, energy .75; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
