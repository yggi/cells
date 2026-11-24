---
id: solo
source: seed
---

```cells
&solo, &soloPlays from &song
&solo [&song + .05]
&soloPlays [0,1,3,4]
```

A solo: the lead blows over the changes and the rhythm section comps under it, the pad laying out to leave it room; the song's intensity and 0.05 more, a groove's lifted by the soloist. Jambot has none: its numbers are chosen here, a jazz chorus of solos (the stab the comping piano or guitar, the lead the horn). Taken by the jazz song form, `head_solos_head`, for its three choruses of solos.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice (`chorus` says how): **`&solo`**, its intensity, the song's plus its offset; **`&soloPlays`**, who plays, the band's entries by `&band`'s order (0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead).

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it; the song forms that take it are found by style.

**Its signature** (decision 065): `&solo, &soloPlays from &song`. `&solo, &soloPlays from solo &song` takes a copy of it, `&song` its main argument.
