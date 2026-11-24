---
title: "A gate: a product with a name"
tags: [tutorial, diatonic]
tier: 9
description: "Where notes become sound, named: a gate plays its voices with each note of what it plays."
---

```cells
&gateNote label="&leadOut is a gate: it plays each note of &tune on the voices in its braid, both of them ([&lead, &bell], a chord), as loud as level= says: &accent per note times .4. It is read as [&tune * &accent * &lead * .4, …]. licence= and accents= say how far its performer plays from what is written, each a share of the feel's: 0 exactly as written, 1 as the feel's. A host's performer reads them; this card plays the notes as written." about=&leadOut
&drumNote label="&drumOut plays a kit: each number of &beat picks the drum, 0 the kick, 1 the snare, 2 the hat, as &beat over=&kit would." about=&drumOut
&roleNote label="&drums is a role: it names the gates that play it, here &drumOut. A reader that knows the role (the feel's drums) plays its gates so; a gate no role names, &leadOut, plays as written. It is no sound: the card sends the gates." about=&drums
&productNote label="The bass is the same thing unnamed: a product in the sound card. &bassLine names its notes with their levels, [&roots * .5], and the card multiplies it by the voice." about=(&bass &bassLine)
&bar from bar &tempo
&strike, &snap, &click from envelopes
&tempo step=free(96bpm, 60..140)
&key scale(major)

&tune over=&key step=8n 0 2 4 2 5 4 2@2 4 5 7 5 4 2 0@2
&accent map=amp step=8n 1 .5 .8 .5
&roots over=&key step=2n 0 3 4 0

&lead s=tri loop=C5 env=&(map=adsr .01 .2 .4 .2)
&bell s=sine loop=C6 env=&(map=adsr 0 .6 0 .3)
&bass s=square loop=C2 lpf=500 env=&strike
&bd note=36 s=sine loop=A1 env=&(map=adsr 0 .3 0 .1)
&sd seed=0 note=38 s=white env=&snap
&hh seed=1 note=42 s=white hpf=7000 env=&click
&kit &bd &sd &hh
&beat step=8n 0 2 1 2

&leadOut play=&tune level=&accent*.4 licence=.5 accents=free(0, 0..1) [&lead, &bell]
&drumOut play=&beat level=.5 &kit
&drums map=role &drumOut
&bassLine [&roots * .5]
&out map=sample postgain=2.54 [&leadOut, &drumOut, &bassLine * &bass]
```
