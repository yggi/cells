---
id: waltz_drums
association:
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
    weight: 1
    facet: rhythm
source: seed
---

```cells
&kick, &chick, &groove from (&bd, &ph)
&bd, &ph from gm_kit
&kick role=kick step=4n &bd:0:.5 ~ ~
&chick role=pedal step=4n ~ &ph:0:.3 &ph:0:.25
&groove [&kick, &chick]
```

A waltz's oom-pah-pah: the kick on one, the pedal hat on two and three, a little softer on three.
At Waltz's point (sync 0, harm 0.7, bite 0.3), weight 1, as the facet `rhythm` (#542).
