---
id: plagal
source: seed
---

```cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd) &key style=(&seaShanty | &kinderlied)
&half step=1m*2 0
&bd from gm_kit
&cadence over=&key step=&half [3,5,7] [0,2,4]@3
&finaleBass over=&cadence step=&half 0 0@2 ~
&finalePad over=&cadence step=&half [0,1,2] [1,2,3]@2 ~
&finaleLead over=&key step=&half 5 4@2 ~
&stomp role=kick step=&half*8 &bd:0:.6 ~!7 &bd:0:.7 ~!23
&finaleDrums [&stomp]
```

The amen: the fourth's chord, then the tonic's (IV, I), the plagal cadence a hymn and a song sung together end on (#720). The bass falls a fourth to the tonic's root, the pad keeps the common tone (the tonic, the fourth's fifth) and moves the others a step (`[1,2,3]`: the tonic chord's third, fifth and root), and the tune falls from the sixth to the fifth, the amen's own line. A stomp on the one and on the landing.

Where a song is sung together: Sea shanty and Kinderlied, weight 1, as the facet `ending`.

**Its signature** (decision 065): the ending's, `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key`, its clock `&half` (the bar's halves by default) and its drums optional: a score that takes `finale` takes this one by changing the name alone (`finale` says how one is placed).
