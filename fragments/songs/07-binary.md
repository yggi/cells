---
id: binary
source: seed
---

```cells
&binary, &binaryPlays from &song style=(&baroque | &march)
&binary &verse &verse &bridge &bridge
&binaryPlays &versePlays &versePlays &bridgePlays &bridgePlays
&verse, &versePlays from verse &song
&bridge, &bridgePlays from bridge &song
```

A binary form, A A B B: its first strain twice (`&verse`), its second twice (`&bridge`).

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 4 sections, 32 bars at eight bars a section.
- **`&binary`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &binary`, and passes it to the band (decision 097).
- **`&binaryPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &binaryPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where a dance or a march is the song: Baroque (a suite's dance in two repeated halves) and a March (its strains, each repeated). Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&binary, &binaryPlays from &song`. `&binary, &binaryPlays from binary &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
