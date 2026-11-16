---
id: strophic
source: seed
---

```cells
&strophic, &strophicPlays from &song style=(&kinderlied | &seaShanty | &waltz)
&strophic &intro &verse &verse &verse &verse &outro
&strophicPlays &introPlays &versePlays &versePlays &versePlays &versePlays &outroPlays
&intro, &introPlays from intro &song
&verse, &versePlays from verse &song
&outro, &outroPlays from outro &song
```

A strophic song: an intro, the same verse four times, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 6 sections, 48 bars at eight bars a section.
- **`&strophic`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &strophic`, and passes it to the band (decision 097).
- **`&strophicPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &strophicPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where a song is sung verse after verse to one tune: Kinderlied, a Sea shanty and a Waltz. The tune keeps its own form inside each verse (the owner, 2026-11-11: "tunes own form beats the style"): Twinkle's ternary is the verse's, not the song's. Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&strophic, &strophicPlays from &song`. `&strophic, &strophicPlays from strophic &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
