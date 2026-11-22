---
title: "A table that comes round: laps and cycle="
tags: [tutorial, tonal, chromatic]
tier: 5
description: "The same tune over two keys that each rise a whole tone a pass: one comes round after an octave, the other after two, so they part and meet again."
---

A turning table, `step=cycle(&theme) stride=2`, moves two steps each pass of the tune it turns for. It comes round after its own length: a table of twelve, after twelve turns.
**`cycle=n`** counts that in laps: the table comes round after n laps of its own length. `cycle=1` is one lap, the octave, so a key rising a tone a pass is back home after six passes; `cycle=2` is two laps, the second octave, and it climbs for twelve. `cycle=0` would hold the first entry, whatever the turn.
Here two voices play one tune, each over a key of its own, and the shorter wheel laps the longer: after six passes the high voice is home and the low one has climbed an octave, and they meet again after twelve.

```cells
&roundNote label="cycle=1: this key rises a tone a pass for one octave, six passes, and comes round to the start." about=&keyA
&twoNote label="cycle=2: the same turn over two octaves, twelve passes before it comes round. The two voices part when the first comes home, and meet again when this one does." about=&keyB
&bar from meter &tempo
&tempo step=free(moderato)

&theme step=4n 0 2 4 2
&keyA step=cycle(&theme) stride=2 cycle=1
&keyB step=cycle(&theme) stride=2 cycle=2
&high over=&keyA step=4n 0 2 4 2
&low over=&keyB step=4n 0 2 4 2

&bell s=tri loop=C5 env=&(map=adsr .005 .4 .2 .3)
&drone s=sine loop=C3 env=&(map=adsr .01 .4 .5 .3)
&out map=sample postgain=3 [&high * &bell * .3, &low * &drone * .4]
```
