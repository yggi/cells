---
id: build
source: seed
---

```cells
&build, &buildPlays from &song
&build [&song + -.15 + &buildRise * .45]
&buildRise step=1m cycle=8 0 .142857142857 .285714285714 .428571428571 .571428571429 .714285714286 .857142857143 1
&buildPlays [0,1,2,3,4]
```

A build: the song's intensity from 0.15 below it to 0.3 above it, rising by the bar over its eight bars, everyone playing.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&build`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&buildPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Lifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `barEnergy`'s build, −0.15 + 0.45 · bar / 7. Its ramp is `&buildRise`, a line by the bar from 0 to 1 over eight bars (k/7 to twelve places, its lap eight bars: `cycle=8`), so a build that starts on a section's first bar, a multiple of eight, climbs from its first bar to its last. Jambot's drummer fills its last bar from the half (`drums.ts`): notes, the composer's.

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&build, &buildPlays from &song`. `&build, &buildPlays from build &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
