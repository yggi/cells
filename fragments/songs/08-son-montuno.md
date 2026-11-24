---
id: son_montuno
source: seed
---

```cells
&sonMontuno, &sonMontunoPlays from &song style=&salsa
&sonMontuno &intro &verse &verse &coro &mambo &coro &outro
&sonMontunoPlays &introPlays &versePlays &versePlays &coroPlays &mamboPlays &coroPlays &outroPlays
&intro, &introPlays from intro &song
&verse, &versePlays from verse &song
&coro, &coroPlays from coro &song
&mambo, &mamboPlays from mambo &song
&outro, &outroPlays from outro &song
```

Salsa's form: an intro, the song itself (its verses, the son), then the montuno section (the kind `coro`: the coro answered by the singer over the piano's figure), the mambo, the horns' riffs at the band's peak, the coro again, and an outro (#720's bonus: section kinds of a style's own).

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 7 sections, 56 bars at eight bars a section.
- **`&sonMontuno`**, the song's intensity section by section: each step a kind's, the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &sonMontuno`, and passes it to the band (decision 097).
- **`&sonMontunoPlays`**, who plays section by section. A score splices it into its selector over the band, `&form over=&band step=1m/8 &sonMontunoPlays` (decision 061).

It ends where its last section ends, and comes round (yggi/jambot#547 rung 5). Where its idiom is: Salsa, which finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections"); Salsa found `vamp` before.

**Its signature** (decision 065): `&sonMontuno, &sonMontunoPlays from &song`. `&sonMontuno, &sonMontunoPlays from son_montuno &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
