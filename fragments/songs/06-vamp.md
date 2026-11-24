---
id: vamp
source: seed
---

```cells
&vamp, &vampPlays from &song style=&funk
&vamp &intro &groove &groove &bridge &groove &breakdown &groove &outro
&vampPlays &introPlays &groovePlays &groovePlays &bridgePlays &groovePlays &breakdownPlays &groovePlays &outroPlays
&intro, &introPlays from intro &song
&groove, &groovePlays from groove &song
&bridge, &bridgePlays from bridge &song
&breakdown, &breakdownPlays from breakdown &song
&outro, &outroPlays from outro &song
```

A vamp with its breaks: an intro, the groove vamped, a bridge, the groove, a breakdown (the band drops out to the rhythm), the groove again, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 8 sections, 64 bars at eight bars a section.
- **`&vamp`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &vamp`, and passes it to the band (decision 097).
- **`&vampPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &vampPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where the vamp is the song: Funk, one groove held long, broken by a bridge and a breakdown (funk's break); Salsa finds its own form, `son_montuno`. Funk finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&vamp, &vampPlays from &song`. `&vamp, &vampPlays from vamp &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
