---
id: Charleston stabs
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: stab
source: seed
lifted: yggi/cells examples/electroswing.md @ 2c120d4
---

```cells
&stabline step=8n cycle=4 &charleston!3 &push
&charleston over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~@4
&push over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~ [0,1,2] ~ [1,2,3]
```

The stabs of [Electro swing, in pieces](../../examples/electroswing.md): the Charleston, a chord on one and on the and of two, three bars, and a fourth that pushes, leaning into the next chord's third and fifth with its root on top.
It is the part the stab performer plays (`&stabline`, decision 058), the first of the facet `stab`, as the bass lines are the bass performer's: its chords are indices into the chord in force (`over=&harm`), so its holes are `&harm` and a meter, and its velocities are the performer's (`&stabLevel`).
`&charleston` and `&push` are its helpers: `use &stabline from "Charleston stabs"` takes them.

At the point proposed for an Electro swing preset (`ELECTRO_SWING`, `src/repository/presets.ts`), weight 1.
