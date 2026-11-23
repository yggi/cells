### Added

- **`notesOf(plan, { from, to })`, a plan's MIDI notes in one call** (#715), from `@yggi/cells/midi`: the six calls a frontend ran in order (`windowAt`, `router(channelTable)`, `routesOf`, `midiNote`) as one, each note with its channel, key, velocity, start and end in seconds and bends, as MIDI out sends them, and the output and voice it comes from and the part and drum role its text declares (`readerOf`). A note on no MIDI key or no card is none; a note on two cards is two.
