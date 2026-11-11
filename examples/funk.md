---
title: "Funk: the sixteenths lean"
tags: [rhythm, modal]
description: "A funk vamp in E dorian, its sixteenths leaning a little and its eighths straight: swing a level finer than jazz's, from the library's band."
---

Jazz swings the eighths, hard, near two thirds ([Swing: the long and the short](swing.md)); funk swings the sixteenths, lightly, and keeps its eighths straight.
It is the same lean, written at a finer level: `swing=16n:.58` moves the second sixteenth of each eighth a little late, and leaves every eighth where it is.
The share is a slider, from straight (1/2) to a triplet's (2/3).
In the Groove MIDI Dataset's drummers (#19, [the measurements](../docs/notes/groove-measure.md)), the funk performances that swing their sixteenths do so at .56 to .63, a median of .60, and the New Orleans ones at .56 to .59; most funk is played straight.

```cells
&swingNote label="swing=16n: the sixteenths lean, the second of each pair this share of the way through its eighth (1/2 straight). The eighths stay straight: the level is the difference from jazz's swing=8n:2/3." about=&swing
&bar from meter(swing=&swing) &tempo
&tempo step=free(100bpm, 80..120)
&swing swing=16n:free(.58, 1/2..2/3)
```

## The band

The drums are the library's, Jambot's Funk bar (`funk_drums`), and so is the bass (`funk_bass`), over a vamp from the library: four bars of E minor, four of A major, the dorian's IV (`vamp_to_the_fourth`).
Each taps the meter by the sixteenth, so each leans as the meter does.

```cells
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from funk_drums
&key from diatonic(mode=dorian) E
&harm from vamp_to_the_fourth &key
&bassline from funk_bass &harm
&hatNote label="The hats on the e and the a of each beat (the second sixteenth of an eighth) come a little late; those on the beats and the ands are straight." about=&hat
```

## The guitar

A chord scratched on the sixteenths, its third and its fifth: most of its strokes are on the e and the a, so they lean; the stab on the and of four is an eighth, and keeps its place.

```cells
&chank over=&harm step=16n ~ [1,2] ~ [1,2] [1,2] ~ [1,2] ~ ~ [1,2] ~ [1,2] ~ ~ [1,2] ~
&chankNote label="Swing the eighths instead (&swing swing=8n:2/3) and this is a shuffle: the sixteenths then fall even within each long and short eighth, and the funk is gone." about=&chank
&bassV from upright_bass
&guitar s=square loop=C4 lpf=2200 env=&(map=adsr .002 .06 0 .03)
&out map=sample postgain=2.72 [&groove, &bassline * &bassV * .6, &chank * &guitar * .25]
```
