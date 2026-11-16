---
id: head_solos_head
source: seed
---

```cells
&headSolosHead, &headSolosHeadPlays from &song style=(&swingJazz | &bossaNova | &bluesShuffle)
&headSolosHead &intro &chorus &groove &groove &groove &chorus &outro
&headSolosHeadPlays &introPlays &chorusPlays &groovePlays &groovePlays &groovePlays &chorusPlays &outroPlays
&intro, &introPlays from intro &song
&chorus, &chorusPlays from chorus &song
&groove, &groovePlays from groove &song
&outro, &outroPlays from outro &song
```

Head, solos, head: an intro, the head (the tune, `&chorus`, everyone playing), three choruses of solos over the changes (`&groove`), the head again, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 7 sections, 56 bars at eight bars a section.
- **`&headSolosHead`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &headSolosHead`, and passes it to the band (decision 097).
- **`&headSolosHeadPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &headSolosHeadPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where jazz's idiom is: Swing jazz, Bossa nova and a Blues shuffle, a tune stated, blown over, and stated again. A jazz "chorus" is one pass through the tune; here the head is the section kind `chorus`, the solos `groove`. Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&headSolosHead, &headSolosHeadPlays from &song`. `&headSolosHead, &headSolosHeadPlays from head_solos_head &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
