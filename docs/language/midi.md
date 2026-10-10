# MIDI cards

A piece can say where its notes go on MIDI: which voice on which channel, and voices that only go to MIDI. A cell with `map=midi` is a **MIDI card**, the sound card's sibling ([mix.md](mix.md)): the sound card's entries are its audio channels, a MIDI card's are its MIDI channels, in order ([decision 019](../decisions/019-midi-card.md)).

```cells
&theme step=1 0 2 4 5
&reed s=square loop=220
&bass step=2 0 ~ 5 4
&sub loop=55
&bar scan(1 1 1 1) step=2
&groove step=&bar/2 &bd ~ &hh ~ [&bd,&sd] ~ &hh &hh
&bd s=sine loop=A1
&sd s=white
&hh s=white hpf=8000
&out loop=SAMPLE_RATE map=sample [&theme * &reed, &groove]
&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove
```

- **Entries are channels.** Channel 1 gets the theme on the reed, channel 2 the bass on the sub, `~!7` leaves 3 to 9 empty, and channel 10 gets the groove. A chord on one entry (`[&theme * &reed, &alto * &cello]`) shares its channel; `x!n` puts one entry on n channels. A card has 16 channels.
- **An entry** is a mix written in place (its products, as on the sound card), a mix cell (`&lead`), or a pattern read through a kit (a groove, `&drums over=&kit`). A melody alone (`&theme`) is an error that names what it lacks: a voice, which gives it its pitch.
- **`map=midi(10)`** puts the whole card on one channel: `&drums map=midi(10) &groove`.
- **`map=midi(10, 2)`** is channel 10 on **output slot 2**. A slot is not a device: the MIDI dialog maps each slot the piece uses to a device, kept in this browser ([../ui/midi.md](../ui/midi.md)), so the piece names only the number. Without one, a card goes to slot 1, the default output chosen in the dialog.
- **Heard and sent.** A voice on the sound card and on a MIDI card sounds and is sent, the same notes on both. A voice only on a MIDI card is **sent, not heard**: it plays nowhere in the built-in sound. A MIDI card doesn't turn, so it takes no `loop=` (an error).
- **What goes out**: each note, its velocity (its level at its start times the numbers in its product on the card, on the square law the default output uses), and its pitch, as a key and a bend for a microtonal note or a glide. A kit's members go as General MIDI drum notes by their names, mapped per device at the output. A voice's sound parameters (`s=`, `lpf=` …) are not sent: the device makes the sound. A voice only on MIDI cards that has some says so once, as a warning, and its sheet says so. No control changes and no program changes go out.
- **A piece with a card says it all.** Once a piece has a MIDI card, only what its cards name is sent: the app's default output (every voice heard, on a channel of its own) doesn't also send the rest, and its channel table shows the piece's channels, "set by the piece". A piece with no card goes out as before.

In the graph a MIDI card is drawn as the sound card is, a node at the top, and its entries go into it as note buses: gate and pitch at once ([../notes/nets.md](../notes/nets.md)), drawn as a solid line broken by a gate's gaps rather than as sound.

MIDI out from the app (the default output, the clock, the devices and their drum maps) is [../ui/midi.md](../ui/midi.md).
