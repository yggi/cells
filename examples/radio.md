---
title: "Radio: a style that drifts"
tags: [genre:dance, arrangement, modal]
description: "A score the default band plays, its style drifting by itself: bite wandering over six octaves of rates (the `wander` module), within a window a hand sets; syncopation and harmony left to sliders. The band's instruments follow, in sections: a song form gives each section its intensity and its players."
---

A radio station written in cells (#576): a score whose section's style, `&style`, moves by itself.
The score is the default band's: it ends in `* from band(…)`, passing the band its five parts and its style, and the band's instruments read `&style` where they sound, the bass's and the lead's cutoffs and the keys' and the pad's envelopes with bite, from paddy to stabby.

Bite drifts, moved by a cell within a window a hand sets (decision 079): its centre and its reach, `bite=free(.55, 0..1) ± free(.35, 0..0.5) * &drift`, the window .2 to .9.
The centre is where the station is tuned; the reach is how far it may wander, decision 076's entropy on this axis.
The drift is the seed's `wander` module (`fragments/modules/`): six noises an octave apart, from a value drawn each section of eight bars to one drawn every 256 bars (a set of four songs), each ramped to the next, summed (decision 079) with the slowest weighing most, so it moves a little each bar and a lot over an hour, as music's slow fluctuations do, and never leaves its window. It is a bounded wander around where the station is tuned: a host that walks the station itself, as Jambot's radio does, moves the sliders, and this moves the style around them (`docs/notes/radio-walkers-measured.md`).
So the band plays the section's style and moves on at the next one: the bass and the lead bite or close, the keys strike or swell.
Syncopation and harmony are left to sliders (`free(…)`), for a hand to set, and mood is held at .5, dorian's at a little more tension than its default.

```cells
&slidersNote label="The style: syncopation and harmony on sliders, bite wandering around where it is tuned." about=&style
&bar from bar &tempo
&tempo step=104bpm
&key from "diatonic(mode=dorian)" D
&harm over=&key step=1m [0,2,4] [3,5,7]
&kick role=kick step=4n &bd &bd &bd &bd
&drumlines [&kick]
&bassline over=&harm step=8n 0 ~ 0 2 ~ 0 4 ~
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=2n ~ [0,2,4]
&leadline over=&key step=8n 4 ~ 3 2 0@4
&mine map=style sync=free(.3, 0..1) harm=free(.45, 0..1) bite=free(.55, 0..1) ± free(.35, 0..0.5) * &drift mood=.5
&section step=1m/8 0
&drift from wander(clock=&section)
&style style=&mine
```

The module's weights are the drift's spectrum: how much it moves at each rate (`docs/notes/571-style-at-every-scale.md`). The sliders lean it: a hand moves the window, and the radio wanders inside it.

## In sections

A station plays songs, not one loop: the radio plays the song form its style finds, `verse_chorus` near Synth-pop (#810, `npm run coverage -- --facet song`), eight bars a section, 64 bars a song.
The form gives the intensity and who plays, section by section, each section a kind taken by name (`fragments/sections/`): `&verseChorus`, the song's level, `&songLevel` at .55, plus each kind's offset (decision 096), and `&verseChorusPlays`, the band's entries.
The score splices them a section a step (decision 097) into `&intensity`, which the band's drums, bass and stabs play at, and into its selector over the band, `&form`: the intro without the lead, the verses without the stabs, the choruses louder, the outro falling away into the next song's intro.
So each section is two things at once, as #571 measured: where the style has drifted to, and how hard and by whom it is played.

```cells
&songLevel .55
&verseChorus, &verseChorusPlays from verse_chorus &songLevel
&intensity step=1m/8 &verseChorus
&form over=&band step=1m/8 &verseChorusPlays
* from band(drumlines=&drumlines, bassline=&bassline, padline=&padline, stabline=&stabline, leadline=&leadline, style=&style, intensity=&intensity)
```
