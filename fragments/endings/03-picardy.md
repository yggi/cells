---
id: picardy
source: seed
---

```cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &drum) &key style=&baroque
&half step=1m*2 0
&drum=lt from gm_kit
&cadence over=&key step=&half [4,4####,4#######,4##########] [0,0####,4]@3
&finaleBass over=&cadence step=&half 0 3@2 ~
&finalePad over=&cadence step=&half [0,1,2,3] [2,3,4]@2 ~
&finaleLead over=&key step=&half 1 0@2 ~
&timpani role=kick step=&half*8 &drum:0:.5 ~!7 &drum:0:.7 ~!23
&finaleDrums [&timpani]
```

The tierce de Picardie: the dominant seventh, then a major tonic chord, its third raised a semitone over a minor key (`[0,0####,4]`: the tonic, four semitones above it, the fifth), as a baroque piece in a minor key ends (#720). Over a major key it is `finale`'s cadence, the tonic already major. The bass, the pad and the lead move as `finale`'s do, and the timpani (the General MIDI kit's low tom) strike the one and the landing.

At Baroque's point, weight 1, as the facet `ending`.

**Its signature** (decision 065): the ending's, `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key`, its clock `&half` (the bar's halves by default) and its drums optional: a score that takes `finale` takes this one by changing the name alone (`finale` says how one is placed).
