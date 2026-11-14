---
id: march_drums
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
    weight: 1
    facet: rhythm
source: seed
---

```cells
&kick, &snare, &groove from (&bd, &sd)
&bd, &sd from gm_kit
&kick role=kick step=4n &bd:0:.7 &bd:0:.5
&snare role=backbeat step=16n &sd:0:.7 ~ &sd:0:.3 &sd:0:.3 &sd:0:.6 ~ &sd:0:.3 &sd:0:.3
&groove [&kick, &snare]
```

A march's drums in 2/4: the bass drum on both beats, the snare's strokes and its soft doubles between them, the field drum's rudiment.
At March's point (sync 0, harm 0.1, bite 0.75), weight 1, as the facet `rhythm` (#542).
