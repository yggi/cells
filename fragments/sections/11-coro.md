---
id: coro
source: seed
---

```cells
&coro, &coroPlays from &song
&coro [&song + .2]
&coroPlays [0,1,2,3,4]
```

A coro: salsa's second half, its montuno section, the coro answered by the singer's pregón over the piano's montuno, everyone playing and the band at its hottest but for the mambo; the song's intensity and 0.2 more, between a chorus and a drop. Jambot has none: its numbers are chosen here. Taken by the salsa song form, `son_montuno`.

A section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice (`chorus` says how): **`&coro`**, its intensity, the song's plus its offset; **`&coroPlays`**, who plays, the band's entries by `&band`'s order (0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead).

It has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it; the song forms that take it are found by style.

**Its signature** (decision 065): `&coro, &coroPlays from &song`. `&coro, &coroPlays from coro &song` takes a copy of it, `&song` its main argument.
