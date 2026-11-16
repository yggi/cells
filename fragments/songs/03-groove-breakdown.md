---
id: groove_breakdown
source: seed
---

```cells
&grooveBreakdown, &grooveBreakdownPlays from &song style=(&deepHouse | &ambient | &darkAmbient | &tripHop | &lofi | &spooky)
&grooveBreakdown &intro &groove &groove &breakdown &groove &groove &outro
&grooveBreakdownPlays &introPlays &groovePlays &groovePlays &breakdownPlays &groovePlays &groovePlays &outroPlays
&intro, &introPlays from intro &song
&groove, &groovePlays from groove &song
&breakdown, &breakdownPlays from breakdown &song
&outro, &outroPlays from outro &song
```

A groove and its breakdown: an intro, a long groove, a breakdown in the middle, the groove again, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 7 sections, 56 bars at eight bars a section.
- **`&grooveBreakdown`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &grooveBreakdown`, and passes it to the band (decision 097).
- **`&grooveBreakdownPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &grooveBreakdownPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where a groove is the song: Deep house, Ambient, Dark ambient, Trip hop, Lo-fi hip hop and Spooky, music that holds one state and thins it once rather than climbing to a peak. Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&grooveBreakdown, &grooveBreakdownPlays from &song`. `&grooveBreakdown, &grooveBreakdownPlays from groove_breakdown &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
