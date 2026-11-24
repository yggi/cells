---
id: drone_out
source: seed
---

```cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &rd) &key style=(&darkAmbient | &tripHop)
&half step=1m*2 0
&rd from gm_kit
&cadence over=&key step=&half [0,2,4]@4
&finaleBass over=&cadence step=&half 0@3 ~
&finalePad over=&cadence step=&half [0,1,2]@3 ~
&finaleLead over=&cadence step=&half 2@3 ~
&ride role=hat step=&half*8 &rd:0:.25 ~!31
&finaleDrums [&ride]
```

No cadence: the tonic held a bar and a half, the bass and the pad on it, the lead on its fifth, and the drums gone but a ride's last touch on the one (#720). The piece doesn't close, it stops moving and is left to the room, as a drone or a dark loop ends.

Where a piece is held rather than resolved: Dark ambient and Trip-hop, weight 1, as the facet `ending`.

**Its signature** (decision 065): the ending's, `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key`, its clock `&half` (the bar's halves by default) and its drums optional: a score that takes `finale` takes this one by changing the name alone (`finale` says how one is placed).
