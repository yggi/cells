---
title: "Twelve-eight: the lean of three"
tags: [genre:blues, rhythm]
description: "A slow blues in 12/8, four beats of three eighths: swing leans nothing here, so a bend leans each three, long, short, short."
---

12/8 is a compound meter: four beats a bar, each a dotted quarter of three eighths, and its bpm counts the beats.
Swing leans pairs, and keeps a group of three even (decision 071): `swing=8n:2/3` on 12/8 leans nothing, and says so.
A three leans by a bend instead (decision 080): `bend=8n:&lean` gives the eighths the table's numbers as their lengths, in turn, so `&lean 4 3 3` plays each three long, short, short, and every beat keeps its length.
Its depth, after a second colon, is a slider: 0 even, 1 as written, 2 the lengths squared (16 : 9 : 9).

```cells
&leanNote label="A lean of three: the eighths of each beat take the lengths 4, 3 and 3, long, short, short; the beats never move. Its depth: 0 even, 1 as written, 2 twice as far." about=&lean
&bar meter("12/8") step=&tempo bend=8n:&lean:free(1, 0..2)
&tempo step=free(60bpm, 45..80)
&lean 4 3 3
```

## The band

The drums are the library's 12/8 bar (`twelve_eight_drums`): the kick on one and three and the snare on two and four, tapping the beats (`step=beat`), and the ride on every eighth, the first of each three the loudest.
The harmony is the library's twelve-bar blues (`twelve_bar`), in C mixolydian, every chord a seventh.
The bass is the motif `shuffle`, the library's slow blues line in 12/8, read over the chord in force rather than the key: root, fifth, seventh, octave, and back.
The piano plays the chord on every eighth, the slow blues' triplets, and leans with the ride.

```cells
&kick, &backbeat, &hat, &groove from twelve_eight_drums
&key from diatonic(mode=mixolydian) C
&harm from twelve_bar &key
&bassline from shuffle &harm
&comp over=&harm step=8n [1,2,3]
&shuffleNote label="shuffle, read over the chord (&harm): 0 2 3 4 is the root, the fifth, the seventh and the octave, long and short over each beat." about=&bassline
&compNote label="The chord on every eighth: under the bend each three is long, short, short." about=(&comp &hat)
```

## The sound

```cells
&bassV from upright_bass
&keys s=tri loop=C4 env=&(map=adsr .005 .25 .2 .2)
&out map=sample postgain=2.59 [&groove, &bassline * &bassV * .6, &comp * &keys * .2]
```
