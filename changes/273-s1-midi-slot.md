### Fixed

- **S1 and S2 hear a MIDI note's output slot** (#273): a rewrite that moves a note from `map=midi(1)` to `map=midi(1, 2)` no longer passes as sounding identical, as one that moves its channel already didn't (#192). A note heard nowhere (`unheard`) differs by its gains of 0, which S1 already reads, and a voice on a MIDI card alone is heard there too (decision 064). No example sends to a slot but the first, so no tool offers a rewrite it didn't.
