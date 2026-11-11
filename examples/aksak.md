---
title: "Aksak: twos and a three"
tags: [genre:world, rhythm]
description: "A 7/8 of two, two and three in D harmonic minor: the pairs swing, the three stays even, and the band is the library's."
---

An aksak ("limping", in Turkish) is a bar of unequal beats, twos and threes: 7/8 as 2 + 2 + 3, 9/8 as 2 + 2 + 2 + 3.
The library's meter takes the grouping as its argument, `meter(grouping=meter("2+2+3"))`; `meter("7/8")` alone is the family's 3 + 2 + 2.
Its bpm counts the beats, three a bar, the last half again as long as the others.

Swing it, and only the twos lean: of each pair of eighths the second comes late, while a group of three plays even (decision 071), as a band swinging a mixed meter does.
The beats never move, so the bar keeps its length and its limp.

```cells
&swingNote label="swing=8n leans the pairs: in 2 + 2 + 3 the first two beats swing, the three stays even. The beats, the long one too, never move." about=&swing
&bar from meter(grouping=meter("2+2+3"), swing=&swing) &tempo
&tempo step=free(150bpm, 100..200)
&swing swing=8n:free(.6, 1/2..2/3)
```

## The band

The drums are the library's 7/8 bar (`aksak_drums`), written in the meter's own counts, beats and pulses, so they lay themselves out in this grouping as in the family's 3 + 2 + 2.
The tune is the motif `limp`, the tonic, the fifth, then a run down to the tonic in the long beat; the form `call_and_answer` answers it two degrees down.
The bass plays the tonic on the first beat and the fifth on the long one.

```cells
&kick, &ghost, &backbeat, &hat, &groove from aksak_drums
&key from harmonic_minor D
&limp from limp &key
&phrase from call_and_answer &call
&call step=8n &limp
&bassline over=&key step=beat 0 ~ 4
&hatNote label="The hat on every eighth: in the twos the second leans late, in the three all three are even." about=&hat
&limpNote label="limp: 0 ~ | 4 ~ | 3 2 0, its run in the three, which stays straight however hard the twos swing." about=&limp
```

## The sound

```cells
&bassV from upright_bass
&leadV from clarinet
&out map=sample postgain=1.93 [&groove, &bassline * &bassV * .6, &phrase * &leadV * .45]
```
