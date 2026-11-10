---
id: salsa_drums
association:
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
    weight: 1
    facet: rhythm
source: seed
---

```cells
&clave, &tumbao, &cascara, &groove from (&claves, &ht, &lt, &mt, &rd)
&claves, &ht, &lt, &mt, &rd from gm_kit
&clave step=16n cycle=2 &claves:0:.5 ~!5 &claves:0:.5 ~!5 &claves:0:.5 ~!7 &claves:0:.5 ~!3 &claves:0:.5 ~!7
&tumbao step=8n &mt:0:.3 &mt:0:.2 &ht:0:.5 &mt:0:.2 &mt:0:.3 &mt:0:.2 &lt:0:.6 &lt:0:.5
&cascara step=4n &rd:0:.45
&groove [&clave, &tumbao, &cascara]
```

A salsa's percussion on a drum kit's voices: the son clave, 3-2, over two bars (as `son_clave_3_2` writes it); the conga's tumbao on the toms (the mid tom's muted strokes, the high tom's slap on two, the low tom's two open tones on four and its off-beat); and the bell's quarters on the ride, as a kit drummer plays the cáscara. It strikes only the 13 voices the drummer takes (#244).
At Salsa's point (sync 0.9, harm 0.5, bite 0.7), weight 1, as the facet `rhythm` (#542).
