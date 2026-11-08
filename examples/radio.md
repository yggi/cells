---
title: "Radio: the style on four sliders"
tags: [genre:dance, arrangement, modal]
description: "A score the default band plays, its style left to four sliders: syncopation, harmony, articulation and energy. Move them, and the band's instruments follow."
---

The first rung of a radio station written in cells (#576): a score whose section's style, `&style`, is left to the performer, an axis a slider (`free(…)`), instead of a style from the library.
The score is the default band's: it ends in `* from band`, and the band's instruments read `&style` where they sound, the bass's cutoff and the keys' and the pad's envelopes with articulation, the lead's cutoff with energy.
So a slider moved is the band played another way: articulation at 0 opens the keys slowly and closes the bass; at 1 the keys strike and the bass bites.

```cells
&slidersNote label="The style, on four sliders: each axis from 0 to 1. Articulation and energy are what the band's instruments read." about=&style
&bar meter("4/4") step=&tempo
&tempo step=104bpm
&key from "diatonic(mode=dorian)" D
&harm over=&key step=1m [0,2,4] [3,5,7]
&kick step=4n &bd &bd &bd &bd
&drumlines [&kick]
&bassline over=&harm step=8n 0 ~ 0 2 ~ 0 4 ~
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=2n ~ [0,2,4]
&leadline over=&key step=8n 4 ~ 3 2 0@4
&mine map=style sync=free(.3, 0..1) harm=free(.45, 0..1) artic=free(.55, 0..1) energy=free(.55, 0..1)
&style style=&mine
* from band
```

Its sliders start at Synth-pop's point (`&synthPop` in the library's `styles`), so it plays as that preset's score until one is moved.
The radio's next rungs patch walkers onto these sliders, so the style drifts by itself when no hand moves it (#571, #576).
