---
title: "Advanced meter: a bent bar, a leaning three"
tags: [tutorial, rhythm]
tier: 4
description: "A 7/8 of two, two and three whose three leans long, short, short: a bend gives the eighths the lengths of a table, and the beats never move."
---

A meter is a bar of beats: `meter("2+2+3")` is seven eighths in beats of two, two and three, so its bpm counts three beats, the last half again as long as the others. Taps of it, `step=beat` and `step=8n`, follow whatever the meter does.
Swing leans the pairs and keeps a three even (decision 071), so it can't lean a three. A **bend** can: `bend=8n:&lean` gives the eighths the numbers of a table as their lengths, in turn, so `&lean 3 3 3 3 4 3 3` plays the twos even and the three long, short, short. The beats, and the bar, never move: only the eighths inside a beat do.
Its depth, after a second colon, is a slider: 0 is even, 1 is as written, 2 the lengths squared (16 : 9 : 9 in the three).

```cells
&leanNote label="A table of seven numbers, one a eighth: the twos are 3 3 and 3 3, even, the three 4 3 3, long, short, short. bend=8n:&lean gives the eighths those lengths; the beats never move." about=&lean
&depthNote label="The bend's depth is a slider after the table: 0 even, 1 as written, 2 twice as far. Drag it and the three leans more or less, the beats where they were." about=&bar
&bar meter("2+2+3") step=&tempo bend=8n:&lean:free(1, 0..2)
&tempo step=free(150bpm, 100..200)
&lean 3 3 3 3 4 3 3

&line over=scale(minor) step=8n 0 2 4 2 4 5 4
&roots over=scale(minor) step=beat 0 0 -3
&beat step=beat &bd ~ &hh

&bd, &hh from gm_kit
&pluck s=tri loop=C4 env=&(map=adsr .005 .3 .1 .2)
&bass s=saw loop=C2 lpf=500 env=&(map=adsr .01 .25 .4 .15)
&out map=sample postgain=3 [&line * &pluck * .3, &roots * &bass * .4, &beat * .5]
```
