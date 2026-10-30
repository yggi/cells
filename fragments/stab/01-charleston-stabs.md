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
&stabline from &harm
&stabline step=8n cycle=4 &charleston!3 &push
&charleston over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~@4
&push over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~ [0,1,2] ~ &ahead
&ahead over=&harm[>>] [1,2,3]
```

The stabs of [Electro swing, in pieces](../../examples/electroswing.md): the Charleston, a chord on one and on the and of two, three bars, and a fourth that pushes: its last stab, on the and of four, is the next chord, its third and fifth with its root on top (`&ahead over=&harm[>>]`, as the funk bass anticipates with `&bassNext`).
It is the part the stab performer plays (`&stabline`, decision 058), the first of the facet `stab`, as the bass lines are the bass performer's: its chords are indices into the chord in force (`over=&harm`), so its holes are `&harm` and a meter, and its velocities are the performer's (`&stabLevel`).
`&charleston`, `&push` and `&ahead` are its helpers: `use &stabline from "Charleston stabs"` takes them.
It is the example's line at the commit it was lifted from, but for that last stab, which there read the chord in force (the owner's review of #305).

At a point proposed for an Electro swing preset (sync .55, harm .75, artic .6, energy .75), weight 1: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.

**Its signature** (decision 064): `&stabline from &harm`. `&stabline from "Charleston stabs" &harm` takes a copy of it, `&harm` its main argument. Taken the old way, `use &stabline from "Charleston stabs"`, it reads `&harm` by name, as before.
