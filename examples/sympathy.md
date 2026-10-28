---
title: "Sympathy: resonators that answer"
tags: [tutorial, sound, physics]
tier: 7
description: A struck fork sets its twin singing, and a harp's strings answer a flute they are never plucked by.
---

```cells
&coupleNote label="couple=&forkB: the two forks share a table, and coupling= says how strongly; only &forkA is struck." about=(&forkA &forkB)
&exciteNote label="excite=&played: the flute's sound drives the strings, which ring where it meets their notes." about=&strings
&bar meter("4/4") step=&tempo
&tempo step=72bpm
&key scale(minor, &tonic)
&tonic A

&hits step=1m/2 0
&tune over=&key step=4n 4 ~ 2 ~ 0@2 ~@2 2 4 7 ~ 4@4

&forkA body=fork loop=A4 ring=8 hard=.35 board=none couple=&forkB coupling=.08 0
&forkB body=fork loop=A4 ring=8 hard=.35 board=none 0
&flute s=tri loop=A4 env=&(map=adsr .05 .3 .6 .4)
&played [&tune * &flute * .2]
&strings body=wire loop=A2 ring=4 board=none excite=&played 0 7 12 19

&out map=sample postgain=.422 [&hits * &forkA * .4, &forkB * .4, &played, &strings * .3]
```
