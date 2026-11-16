---
id: outro
source: seed
---

```cells
&outro, &outroPlays from &song
&outro [&song + &outroFall * -.45]
&outroFall step=1m cycle=8 0 .142857142857 .285714285714 .428571428571 .571428571429 .714285714286 .857142857143 1
&outroPlays [0,1,2,3]
```

An outro: the song's intensity falling by the bar to 0.45 below it over its eight bars, the lead resting.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&outro`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&outroPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Jambot has no outro (its song never ends: yggi/jambot#547 rung 5): its numbers are chosen here (#810 rung 2). It is a build turned round, its ramp `&outroFall` from 0 to 1 by the bar (k/7), the song's intensity falling to a breakdown's (−0.45) by its last bar, and the lead resting as in an intro, the song closing as it opened.

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&outro, &outroPlays from &song`. `&outro, &outroPlays from outro &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
