---
title: "The diatonic circle: one triad, turned a fourth a bar"
tags: [genre:classical, harmony, diatonic, tonal]
description: The Baroque sequence I IV vii° iii vi ii V, its chords one triad turned through the key, not seven written out.
---

```cells
&triadNote label="&triad is even(3, 7) over the key: every other degree, the chord. Turned with the key's degrees, a fourth each bar, it is each chord of the sequence in turn." about=&triad
&powerNote label="&power is even(2, 3, 1) over the triad: its root and fifth, the bass's notes. Each level of the key is even inside the one above, as a meter's are (decision 072)." about=&power
# The diatonic circle of fifths, the Baroque sequence I IV vii° iii vi ii V: each chord a fourth above the last.
# No chord is written out: the key's degrees turn a fourth a bar (stride=3), the triad reads them, and every part
# reads the triad, so 0 1 2 is the chord of the bar, whichever it is (#508).
&bar from meter &tempo
&tempo step=free(84bpm, 60..120)
&key scale(major, &tonic) label="{mode} on {tonic}"
&tonic C

&degrees over=&key step=1m stride=3 0 1 2 3 4 5 6        # the key from the chord's root: a fourth on, each bar
&triad over=&degrees even(3, 7)                          # the chord: every other degree
&power over=&triad even(2, 3, 1)                         # its root and fifth

&pad over=&triad step=1m [0,1,2]
&arp over=&triad step=8n 0 1 2 3 2 1 0 1
&bass over=&power step=4n -2 -1 -2 -1

&keys s=tri loop=C4 env=&(map=adsr .01 .5 .3 .3)
&low s=sine loop=C3 env=&(map=adsr .01 .3 .6 .2)
&out map=sample [&pad * &keys * .1, &arp * &keys * .15, &bass * &low * .4]
```

The sequence written out would be seven chords of degree lists, `[0,2,4] [3,5,7] [6,8,10] [2,4,6] [5,7,9] [1,3,5] [4,6,8]`, and every part would carry its own copy of them: the arpeggio 56 numbers, the bass 28. Here the chord is a level of the key, as a beat is a level of the meter (#508, decision 072): the triad is `even(3, 7)` of the key's degrees, the root and fifth `even(2, 3, 1)` of the triad, and the parts read the level they need. It sounds identical to the written-out text and is 84 to its 154 by decision 049's measure (`npm run structure`), the test in `grade.test.ts` holding both.
