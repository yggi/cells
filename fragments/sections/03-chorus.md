---
id: chorus
source: seed
---

```cells
&chorus, &chorusPlays from &song
&chorus [&song + .15]
&chorusPlays [0,1,2,3,4]
```

A chorus: the song's intensity and 0.15 more, everyone playing.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&chorus`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&chorusPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Jambot has no chorus: its numbers are chosen here (#810 rung 2). It lies between a groove (0) and a drop (+0.3), a lift a verse–chorus song returns to, not a drop's peak: 0.25 above the verse, about as far as a build climbs in half its bars.

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&chorus, &chorusPlays from &song`. `&chorus, &chorusPlays from chorus &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
