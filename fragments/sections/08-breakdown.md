---
id: breakdown
source: seed
---

```cells
&breakdown, &breakdownPlays from &song
&breakdown [&song + -.45]
&breakdownPlays [0,1,2]
```

A breakdown: the song's intensity less 0.45, the drums, the bass and the pad playing, the stab and the lead resting.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&breakdown`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&breakdownPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Lifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.breakdown` −0.45; the lead rests (`lead.ts`), and the comp pads only, no stab (`comp.ts`: `stabDensity` 0 where `quiet`). How the others play there is notes, the composer's: the drums hats alone and a snare fill in its last bar (`drums.ts`), the bass each chord's root held (`bass.ts`).

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&breakdown, &breakdownPlays from &song`. `&breakdown, &breakdownPlays from breakdown &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
