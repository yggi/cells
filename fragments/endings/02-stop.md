---
id: stop
source: seed
---

```cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &cr) &key style=(&acid | &happyHardcore | &elektro | &chiptune | &salsa)
&half step=1m*2 0
&bd, &cr from gm_kit
&cadence over=&key step=&half [0,2,4]@4
&finaleBass over=&cadence step=&half*4 0 ~!15
&finalePad over=&cadence step=&half*4 [0,1,2] ~!15
&finaleLead over=&cadence step=&half*4 3 ~!15
&kick role=kick step=&half*8 &bd:0:.8 ~!31
&crash role=hat step=&half*8 &cr:0:.7 ~!31
&finaleDrums [&kick, &crash]
```

The stop on the one: the band plays the downbeat together, the tonic chord an eighth long, the kick and a crash under it, and then nothing (#720). No cadence: the groove's last bar was the approach, and the ending is the bar after it, cut, the crash left to ring. The tonic is `[0,2,4]`, the key's triad, the lead on its root an octave up (`3`).

Where a dance track ends so, or a band ends on a hit: Acid, Happy hardcore, Elektro and Chiptune (the game's last note), and Salsa, whose cierre lands on the one; weight 1, as the facet `ending`.

**Its signature** (decision 065): the ending's, `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key`, its clock `&half` (the bar's halves by default) and its drums optional: a score that takes `finale` takes this one by changing the name alone (`finale` says how one is placed).
