---
title: "Radio: a style that drifts"
tags: [genre:dance, arrangement, modal]
description: "A score the default band plays, its style drifting by itself: articulation as three rates summed, energy once every two sections, syncopation and harmony left to sliders. The band's instruments follow."
---

A radio station written in cells (#576): a score whose section's style, `&style`, moves by itself.
The score is the default band's: it ends in `* from band`, and the band's instruments read `&style` where they sound, the bass's cutoff and the keys' and the pad's envelopes with articulation, the lead's cutoff with energy.

Two of the style's axes drift, each moved by a cell within a window a hand sets (decision 079): articulation's window by its two ends, `artic=free(.2, 0..1)..free(.9, 0..1) * &drift`, energy's by its centre and reach, `energy=free(.55, 0..1) ± free(.25, 0..0.5) * &swell`.
Articulation's drift is three sample-and-holds summed (decision 079), each a value drawn afresh each step and held for it: once a section of eight bars, once a song of 32, once a set of 128, weighted .5, .3 and .2, so it moves most from section to section and least over a set, as music's slow fluctuations do.
Energy's is one sample-and-hold, once every two sections.
So the band plays the section's style and moves on at the next one: the bass bites or closes, the keys strike or swell, the lead brightens or darkens.
The other two axes are left to sliders (`free(…)`), for a hand to set.

```cells
&slidersNote label="The style: syncopation and harmony on sliders, articulation and energy drifting a section at a time." about=&style
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
&mine map=style sync=free(.3, 0..1) harm=free(.45, 0..1) artic=free(.2, 0..1)..free(.9, 0..1) * &drift energy=free(.55, 0..1) ± free(.25, 0..0.5) * &swell
&drift [&section * .5 + &song * .3 + &set * .2]
&section step=1m/8 [0|.25|.5|.75|1]
&song step=1m/32 [0|.25|.5|.75|1]
&set step=1m/128 [0|.25|.5|.75|1]
&swell step=1m/16 [0|.5|1]
&style style=&mine
* from band
```

The weights are the drift's spectrum: how much it moves at each rate (`docs/notes/571-style-at-every-scale.md`). The sliders lean it: a hand moves the window, and the radio wanders inside it.
