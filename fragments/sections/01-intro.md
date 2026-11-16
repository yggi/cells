---
id: intro
source: seed
---

```cells
&intro, &introPlays from &song
&intro [&song + -.3]
&introPlays [0,1,2,3]
```

An intro: the song's intensity less 0.3, the lead resting.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&intro`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&introPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Lifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.intro` −0.3; the lead rests in an intro (`lead.ts`, `rests`). A song's first section, which Jambot's chain only starts with (`appeal`: 0 after it).

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&intro, &introPlays from &song`. `&intro, &introPlays from intro &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
