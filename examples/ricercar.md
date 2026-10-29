---
title: "Ricercar: a study in counterpoint"
tags: [genre:classical, artist:Bach, tonal, counterpoint, stereo]
description: A study in counterpoint on the King's theme, from strict to free, in six passes.
---

```cells
use &vibrato
&passesNote label="A pass each: 1 the theme alone · 2 note against note, above · 3 note against note, below · 4 two against one · 5 four against one · 6 free, in three voices." about=(&upper &lower)
&consonanceNote label="On every note of the theme the voices agree (consonances only); between, a dissonance only passes, by step." about=(&theme &upper &lower)

&bar scan(27 23 26 24) step=&tempo laps=30                       # thirty bars: six passes of the theme, then it ends
&tempo step=free(66bpm, 40..96)
&theme over=&scale step=4n label="the King's theme" 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2
&scale over=&key scan(2 1 2 2 1 2 2)                   # … read in C minor,
&key step=cycle(&theme) stride=free(0, 0..7) cycle=24 label="per tonos · in **{tonic}**"   # raise stride: a key higher each pass

# the counterpoints, in semitones over the key (they transpose with the theme), in eighths
&first over=&key label="1 : 1 above — *first species*" 24@4 22@4 19@4 17@4 20@4 ~@2 19@2 20@2 22@2 24@2 20@2 22@4 ~@4
&under over=&key label="1 : 1 below — the bass" -12@4 -13@4 -12@4 -19@4 -17@4 ~@2 -19@2 -16@2 -17@2 -15@2 -13@2 -12@4 ~@4
&second over=&key label="2 : 1 — *second species*" 19@2 17@2 19@2 20@2 19@2 17@2 15@2 17@2 19@2 21@2 ~@2 19@2 20@2 19@2 21@2 17@2 15@2 14@2 ~@4
&third over=&key label="4 : 1 — *third species*" 19 17 19 20 19 17 19 21 19 20 19 21 23 21 22 24 23 21 22 20 ~@2 19 21 23 21 19 17 21 24 23 21 22 20 22 19 ~@4
&florid over=&key label="free, over the bass" 19 17 19 20 19 17 19 20 19 21 22 24 17 20 22 24 23 24 26 23 ~@2 21 24 23 21 19 22 24 22 20 22 24 22 20 19 ~@4

&upper step=8n ~@40 &first ~@40 &second &third &florid        # a pass each: alone · above · (below) · 2:1 · 4:1 · free
&lower step=8n ~@80 &under ~@80 &under                         # the bass: in pass 3, and again under the free line

&organ loop=C4 map=lin 0 1 env=&(map=adsr .03 .25 .7 .6)        # one pipe, one breath: the theme
&flute pan=.28 s=sine loop=C4 env=&(map=adsr .03 .1 .8 .2) pitch=&vibrato
&bourdon pan=.7 s=tri loop=C4 lpf=900 env=&(map=adsr .02 .15 .8 .3)

&out postgain=2.2 map=sample [&theme * &organ * .5, &upper * &flute * .45, &lower * &bourdon * .5]
```
