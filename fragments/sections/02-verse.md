---
id: verse
source: seed
---

```cells
&verse, &versePlays from &song
&verse [&song + -.1]
&versePlays [0,1,2,4]
```

A verse: the song's intensity less 0.1, the lead over the drums, the bass and the pad, the stab resting.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.
- **`&verse`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).
- **`&versePlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).

Jambot has no verse: its numbers are chosen here (#810 rung 2). It sits where Jambot's bridge sits on intensity (−0.1), below the chorus it leads to, and leaves the stab out so the line it carries is heard over a lighter comp, as a verse's arrangement leaves room for its words.

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.

**Its signature** (decision 065): `&verse, &versePlays from &song`. `&verse, &versePlays from verse &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.
