### Repository

- **`style` teaches a sum of values** (#621, #856): the bass's level in the sound card is `&bassLevel [&leadLevel + .1]`, a sum of values beside the lead's number cell, and a note says so; `sort plain: a sum of values` leaves `PENDING` for tier 6. **What a frontend sees at its next pin:** `style`'s bass plays at that level, the same loudness on the sound card (0.5) and, through a MIDI card, another velocity (a sum is a level in a product, decision 088, where a number is a gain): 19 of its 150 events in the snapshot's span change their `levels` and `gains`, no note moves.
