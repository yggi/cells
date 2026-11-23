---
id: blues_ending
source: seed
---

```cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &sd, &hh, &rd) &key style=&bluesShuffle
&half step=1m*2 0
&bd, &sd, &hh, &rd from gm_kit
&cadence over=&key step=&half [4,4####,4#######,4##########] [0,0####,0#######,0##########]@3
&finaleBass over=&cadence step=&half 0 4@2 ~
&finalePad over=&cadence step=&half [0,1,2,3] [1,2,3,4]@2 ~
&finaleLead over=&cadence step=&half 2 4@2 ~
&kick role=kick step=&half*8 &bd:0:.6 ~!7 &bd:0:.7 ~!23
&backbeat role=backbeat step=&half*8 ~!4 &sd:0:.45 ~ &sd:0:.5 ~ &sd:0:.65 ~!23
&hat role=hat step=&half*8 &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &rd:0:.5 ~!23
&finaleDrums [&kick, &backbeat, &hat]
```

The blues ends on a seventh: the dominant seventh, then the tonic's seventh chord, the tonic with its flat seventh (`[0,0####,0#######,0##########]`: the root, four, seven and ten semitones above it), left hanging, as a blues does (#720). The bass rises a fourth to the tonic's root (`4`: over a chord of four, its root a lap up) and the drums land as `finale`'s do; the pad moves to the tonic seventh's nearest voicing (its third, fifth, seventh and root); the lead falls a step from the dominant's fifth to the tonic.

At Blues shuffle's point, weight 1, as the facet `ending`.

**Its signature** (decision 065): the ending's, `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key`, its clock `&half` (the bar's halves by default) and its drums optional: a score that takes `finale` takes this one by changing the name alone (`finale` says how one is placed).
