---
id: verse_chorus
source: seed
---

```cells
&verseChorus, &verseChorusPlays from &song style=(&synthPop | &chiptune | &electroSwing)
&verseChorus &intro &verse &chorus &verse &chorus &bridge &chorus &outro
&verseChorusPlays &introPlays &versePlays &chorusPlays &versePlays &chorusPlays &bridgePlays &chorusPlays &outroPlays
&intro, &introPlays from intro &song
&verse, &versePlays from verse &song
&chorus, &chorusPlays from chorus &song
&bridge, &bridgePlays from bridge &song
&outro, &outroPlays from outro &song
```

A verse–chorus song: an intro, two verses each answered by its chorus, a bridge, the chorus once more, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 8 sections, 64 bars at eight bars a section.
- **`&verseChorus`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &verseChorus`, and passes it to the band (decision 097).
- **`&verseChorusPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &verseChorusPlays` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where pop's idiom is: Synth-pop, Chiptune (a game's title tune written as a pop song) and Electro swing (vocal swing remade as a pop single), the song a radio plays whole. Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): `&verseChorus, &verseChorusPlays from &song`. `&verseChorus, &verseChorusPlays from verse_chorus &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).
