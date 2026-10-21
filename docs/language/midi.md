# MIDI cards

A piece can say where its notes go on MIDI: which voice on which channel, and voices that only go to MIDI. A cell with `map=midi` is a **MIDI card**, the sound card's sibling ([mix.md](mix.md)): the sound card's entries are its audio channels, a MIDI card's are its MIDI channels, in order ([decision 019](../decisions/019-midi-card.md)).

```cells
&theme step=1 0 2 4 5
&reed s=square loop=220
&bass step=2 0 ~ 5 4
&sub loop=55
&bar scan(1 1 1 1) step=2
&groove step=8n &bd ~ &hh ~ [&bd,&sd] ~ &hh &hh
&bd s=sine loop=A1
&sd s=white
&hh s=white hpf=8000
&out loop=SAMPLE_RATE map=sample [&theme * &reed, &groove]
&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove
```

- **Entries are channels.** Channel 1 gets the theme on the reed, channel 2 the bass on the sub, `~!7` leaves 3 to 9 empty, and channel 10 gets the groove. A chord on one entry (`[&theme * &reed, &alto * &cello]`) shares its channel; `x!n` puts one entry on n channels. A card has 16 channels.
- **An entry** is a mix written in place (its products, as on the sound card), a mix cell (`&lead`), or a pattern read through a kit (a groove, `&drums over=&kit`). A melody alone (`&theme`) is an error that names what it lacks: a voice, which gives it its pitch.
- **`map=midi(10)`** puts the whole card on one channel: `&drums map=midi(10) &groove`. There `x!n` would send each note n times on that channel, so it warns.
- **`map=midi(10, 2)`** is channel 10 on **output slot 2**. A slot is not a device: slot n is the nth output of the MIDI page, whose device is this browser's ([../ui/midi.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/midi.md)), so the piece names only the number. Without one, a card goes to slot 1, the first output.
- **Heard and sent.** A voice on the sound card and on a MIDI card sounds and is sent, the same notes on both. A voice only on a MIDI card is **sent, not heard**: it plays nowhere in the built-in sound. A piece that writes only MIDI cards gets no built-in sound card ([decision 028](../decisions/028-the-smallest-piece.md)): what its cards don't name sounds nowhere. A MIDI card doesn't turn, so it takes no `loop=` (an error).
- **What goes out**: each note, its velocity (its level at its start times the numbers in its product on the card, on the square law the default output uses), and its pitch, as a key and a bend for a microtonal note or a moving pitch; a `glide=` run as its notes, each held into the next by the slide (legato, which a synth's legato or portamento glides on). A kit's members go as General MIDI drum notes by their names, mapped per device at the output. A kit read beside a pitch term (a melody it is held under, a key, a number in the sum: [decision 029](../decisions/029-kits-pass-pitch.md)) transposes the member it picks, so its notes go out at their pitch, as a voice's do: on a card on its entry's channel (an entry is a channel, whatever plays in it); with no card each member on its own channel, as if played directly (`&theme * &orch` sends the theme on the lead's channel while the pattern picks the lead, on the organ's while it picks the organ). Plain drums, a kit read with no other pitch term, stay drum notes. A voice's sound parameters (`s=`, `lpf=` …) are not sent: the device makes the sound. A voice only on MIDI cards that has some says so once, as a warning, and its sheet says so. No control changes and no program changes go out.
- **Drum names.** A kit member's name gives its General MIDI drum note, in any case, a trailing number ignored (`bd2` is a kick): all 47 of General MIDI's percussion notes, 35–81, each under Strudel's short name where Strudel has one and General MIDI's name, spelled as one word, as its alias (decision 054; `GM_KIT` in `src/engine/midi.ts`, and the seed library's `gm kit` defines a voice under each first name): `acousticbassdrum` 35, `bd` `kick` `kd` `bassdrum` 36, `rim` `rs` `sidestick` 37, `sd` `snare` `acousticsnare` 38, `cp` `clap` `handclap` 39, `electricsnare` 40, `lt` `lo` `lowfloortom` 41, `hh` `ch` `closedhihat` 42, `highfloortom` 43, `ph` `pedalhihat` 44, `mt` `tom` `mid` `lowtom` 45, `oh` `openhihat` 46, `lowmidtom` 47, `ht` `hi` `himidtom` 48, `cr` `crash` `crashcymbal` 49, `hightom` 50, `rd` `ride` `ridecymbal` 51, `chinesecymbal` 52, `ridebell` 53, `tb` `tambourine` 54, `splashcymbal` 55, `cb` `cowbell` 56, `crashcymbaltwo` 57, `vibraslap` 58, `ridecymbaltwo` 59, `hibongo` 60, `lowbongo` 61, `mutehiconga` 62, `openhiconga` 63, `lowconga` 64, `hightimbale` 65, `lowtimbale` 66, `highagogo` 67, `lowagogo` 68, `cabasa` 69, `sh` `maracas` 70, `shortwhistle` 71, `longwhistle` 72, `shortguiro` 73, `longguiro` 74, `claves` `clave` 75, `hiwoodblock` 76, `lowwoodblock` 77, `mutecuica` 78, `opencuica` 79, `mutetriangle` 80, `opentriangle` 81. `rim` is the side stick a drummer plays a clave rhythm with, `claves` the clave itself; `sh` is the maracas. Any other name takes the next note from 36 that no other member of its kit has, so its note depends on its kit (`kitNotes` in `src/engine/midi.ts`).
- **A piece with a card says it all.** Once a piece has a MIDI card, only what its cards name is sent: the app's default routing (every voice heard, on a channel of its own) doesn't also send the rest, and the MIDI page's matrix shows the piece's channels, read only. A piece with no card goes out as before.

In the graph a MIDI card is drawn as the sound card is, a node at the top, and its entries go into it as note buses: gate and pitch at once ([../notes/nets.md](../notes/nets.md)), drawn as a solid line broken by a gate's gaps rather than as sound.

MIDI out from the app (the default output, the clock, the devices and their drum maps) is [../ui/midi.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/midi.md).
