---
title: "A band-pass: letting a band through"
tags: [tutorial, sound]
tier: 2
description: "A saw through a band-pass whose centre steps up and down the spectrum, against the same filter in two stages: bpf=, bpq= and ftype=."
---

A low-pass lets the lows through and a high-pass the highs; a **band-pass** lets one band through, around a centre. `bpf=` is that centre in Hz and `bpq=` is its Q, the centre over the bandwidth: 1 is wide, 8 narrow and ringing.
Here the centre moves, `bpf=300..3000 * &sweep`: the range, scaled by a cell that steps up and down, read at each note's start. (Moving parameters, filters that open and fades in decibels, have a tier of their own, [Moving parameters](moving.md); this one only steps.)
`ftype=` is the filters' model: `12db`, one stage, is the default, `24db` runs two in series for a steeper edge, and `ladder` is a ladder low-pass. The second voice plays the same line through the same sweep in two stages, and is thinner at the edges of its band.

```cells
&bandNote label="bpf= is the band-pass's centre in Hz, bpq= how narrow the band is (its Q): the saw is heard only around the centre, which &sweep moves between 300 and 3000 Hz." about=(&wah &sweep)
&stagesNote label="ftype=24db puts two stages in series: the same sweep, a steeper skirt. &wah is one stage, 12db, the default." about=&wah24
&bar from bar &tempo
&tempo step=free(moderato)

&tune step=8n 0 0 7 0 3 0 5 7 0 0 7 0 3 5 3 ~
&line step=2n 0 7 5 3
&sweep loop=&bar*2 0 .15 .4 .7 1 .7 .4 .15

&wah s=saw loop=C3 bpf=300..3000 * &sweep bpq=4 env=&(map=adsr .005 .2 .5 .15)
&wah24 s=saw loop=C3 bpf=300..3000 * &sweep bpq=4 ftype=24db env=&(map=adsr .01 .3 .6 .3)
&out map=sample postgain=3 [&tune * &wah * .3, &line * &wah24 * .3]
```
