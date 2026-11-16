---
id: groove
source: seed
---

```cells
&groove, &groovePlays from &song
&groove [&song + 0]
&groovePlays [0,1,2,3,4]
```

A groove: the song's own intensity, everyone playing.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&groove`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&groovePlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Lifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.groove` 0. The section Jambot's chain stays in where entropy is low.

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&groove, &groovePlays from &song`. `&groove, &groovePlays from groove &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
