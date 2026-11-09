---
id: drone_pad
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

```cells
&padV s=saw loop=C3 distort=.8 lpf=120..600 * &(map=lin loop=.0435 .15 .7 .3 .15) lpq=3 env=&(map=adsr 4 2 .9 6)
```

The drone of [Ghost-Cells](../../examples/ghosts.md): a saw distorted hard, its low-pass breathing between 120 and 600 Hz over 23 seconds, swelling in over four seconds and fading over six.
It defines `&padV`, the voice the pad performer plays, at the default pad's register (`loop=C3`; the example's drone sits two octaves lower, on D1).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #572).
