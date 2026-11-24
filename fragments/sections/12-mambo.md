---
id: mambo
source: seed
---

```cells
&mambo, &mamboPlays from &song
&mambo [&song + .25]
&mamboPlays [0,1,3]
```

A mambo: the horns' section, their riffs (the stab) over the drums and the bass, the pad and the lead out, the band's peak before the last coro; the song's intensity and 0.25 more. Jambot has none: its numbers are chosen here. Taken by the salsa song form, `son_montuno`.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice (`chorus` says how): **`&mambo`**, its intensity, the song's plus its offset; **`&mamboPlays`**, who plays, the band's entries by `&band`'s order (0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead).

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it; the song forms that take it are found by style.

**Its signature** (decision 065): `&mambo, &mamboPlays from &song`. `&mambo, &mamboPlays from mambo &song` takes a copy of it, `&song` its main argument.
