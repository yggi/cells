---
id: build_drop
source: seed
---

```cells
&buildDrop, &buildDropPlays from &song style=(&techno | &acid | &happyHardcore | &elektro)
&buildDrop &intro &groove &build &drop &breakdown &build &drop &outro
&buildDropPlays &introPlays &groovePlays &buildPlays &dropPlays &breakdownPlays &buildPlays &dropPlays &outroPlays
&intro, &introPlays from intro &song
&groove, &groovePlays from groove &song
&build, &buildPlays from build &song
&drop, &dropPlays from drop &song
&breakdown, &breakdownPlays from breakdown &song
&outro, &outroPlays from outro &song
```

A build and a drop, twice: an intro, a groove, a build that drops, a breakdown, a second build and drop, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 8 sections, 64 bars at eight bars a section.
- **`&buildDrop`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &buildDrop`, and passes it to the band (decision 097).
- **`&buildDropPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &buildDropPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where the dance floor's idiom is: Techno, Acid, Happy hardcore and Elektro, the tension and release Jambot's own chain plays at high energy (a build always drops, `FOLLOWERS.build`). Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&buildDrop, &buildDropPlays from &song`. `&buildDrop, &buildDropPlays from build_drop &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
