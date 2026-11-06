---
title: Kinderlieder, in pieces
tags: [genre:folk, diatonic, motifs, arrangement]
description: "Twinkle and Hänschen klein from the seed library: each tune's lines are motifs, each tune's shape a form, over a vamp of two chords, a root bass and the plainest beat."
---

Two children's songs, the kind a learner plays first, made of the seed library's pieces.
Each tune is its lines, each a motif of one bar: Twinkle's call `twinkle` and its answer `wonder`; Hänschen klein's call `haenschen`, its open answer `hinein`, its close `heim` and its bridge `weinet`.
Each tune's shape is a form: Twinkle's is `ternary`, A B A, its bridge the answer a step up; Hänschen klein's is `rounded_binary`, A A′ B A′.
The band is the library's too: the plainest beat, `kinderlied_drums` (the kick on one and three, the snare on two and four, a closed hat on every beat), a vamp of two chords, the tonic for four bars and the fifth for four, and the root bass under it.

```cells
&bar from meter &tempo
&tempo step=free(100bpm, 80..120)
&key from diatonic(mode=ionian) C
&harm from vamp_to_the_fifth &key
&bassline from root_bass &harm
&drums, &drumsOut from drums_performer &drumlines
&bass, &bassOut from bass_performer &bassline
&leadOut from lead_performer &leadline
&kick, &backbeat, &hat from kinderlied_drums
&drumlines [&kick, &backbeat, &hat]
&bandNote label="The band: the Kinderlied beat, a vamp of the tonic and the fifth, the root bass, all from the library." about=(&drumlines &harm &bassline)
```

## The tunes, in pieces

Each line is a motif of the library's, a bar of eighths over the key.
The forms put them together: `ternary` takes Twinkle's call and names its answer, and makes its bridge of the answer a step up, *up above the world so high*; `rounded_binary` takes Hänschen klein's call and names its open answer, its close and its bridge, which it plays twice, the second time a step up, *hat ja nun kein Hänschen mehr*.

```cells
&twinkle from twinkle &key
&wonder from wonder &key
&haenschen from haenschen &key
&hinein from hinein &key
&heim from heim &key
&weinet from weinet &key
&twinkleSong from ternary(answer=&wonder) &twinkle
&haenschenSong from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen
&leadline step=8n ~@16 &twinkleSong &haenschenSong
&tuneNote label="Twinkle in 6 bars after a 2-bar intro, then Hänschen klein in 8: each tune its motifs, each shape a form." about=(&twinkleSong &haenschenSong)
```

## The sound

A music box for the tune, a soft round bass, and the general MIDI kit for the drums.

```cells
&bassV s=sine loop=C3 env=&(map=adsr .005 .4 .4 .1)
&leadV s=tri loop=C5 env=&(map=adsr .005 .3 .3 .2)
&out map=sample postgain=1.6 [&drumsOut * .7, &bassOut * .8, &leadOut * .6]
```
