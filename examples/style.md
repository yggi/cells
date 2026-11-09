---
title: "Style: a point the voices read"
tags: [tutorial, sound, harmony]
tier: 6
description: "Two styles, one by name and one in order, and the section's style turning between them: the bass bites as the style grows stabby, the lead darkens as its mood does."
---

A style is a point: where the accents fall (`sync`), how the harmony moves (`harm`), how notes start and end (`bite`, paddy to stabby) and the mood (`mood`, darker to brighter).
A `map=style` cell writes one, its axes by name (in order, `.3 .3 .9 .2`, reads the same); it doesn't sound, a voice reads it.
`&style` is the section's style, and a voice reads one of its axes by name, `&style[bite]`, as a factor of a moving parameter.
The tune turns the minor scale's i, VI, III and VII, a bar each, and the bass plays their roots.

```cells
&bar from meter &tempo
&strike from envelopes
&tempo step=free(112bpm, 90..140)
&calm map=style sync=.1 harm=.3 bite=.1 mood=.9 label="Calm: on the beat, paddy, bright"
&tense map=style sync=.3 harm=.3 bite=.9 mood=.2 label="Tense: stabby and dark"
&style style=&calm..&tense * &turn
&turn map=lin step=1m 0 .25 .5 .75 1 .75 .5 .25
&styleNote label="&style turns between the two styles as &turn says, and &style[bite] and &style[mood] read one axis each: the bass's cutoff opens as the style grows stabby, the lead's closes as its mood darkens." about=(&bassV &leadV)
&key scan(2 1 2 2 1 2 2)
&tune over=&key step=8n 4 ~ 2 4 7 4 2 0
&root over=&key step=1m 0 5 2 6
&bassV s=saw loop=A1 lpf=250..1600 * &style[bite] lpq=6 env=&strike
&leadV s=tri loop=A3 lpf=500..4000 * &style[mood] env=&(map=adsr .01 .2 .6 .2)
&out map=sample postgain=2 [&tune * &leadV * .4, &root * &bassV * .5]
```
