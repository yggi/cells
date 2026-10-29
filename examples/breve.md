---
title: Alla breve and sixteenths
tags: [tutorial, rhythm]
tier: 4
description: beat=2 counts a 4/4 bar in halves, and pulse=16n gives a scan's entries a sixteenth each.
---

```cells
&bar meter("4/4") beat=2 step=60bpm      # alla breve: two beats a bar, bpm counts half notes
&sixteenths scan(1 1 1 1) pulse=16n step=60bpm   # a scan whose entries are sixteenths

&low step=&bar:beat 0 4
&run over=scale(minor) step=&sixteenths:16n 0 2 4 2

&bell s=sine loop=A2 env=&(map=adsr 0 .3 0 .1)
&out map=sample postgain=6.02 [&low * &bell * .6, &run * &bell * .3]
```
