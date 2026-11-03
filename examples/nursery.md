---
title: Nursery songs, in pieces
tags: [genre:folk, diatonic, motifs, arrangement]
description: "Twinkle and Hänschen klein from the seed library: each tune's lines are motifs, each tune's shape a form, over a vamp of two chords, a root bass and the plainest beat, the piece's own."
---

Two children's songs, the kind a learner plays first, made of the seed library's pieces.
Each tune is its lines, each a motif of one bar: Twinkle's call `twinkle` and its answer `wonder`; Hänschen klein's call `haenschen`, its open answer `hinein`, its close `heim` and its bridge `weinet`.
Each tune's shape is a form: Twinkle's is `ternary`, A B A, its bridge the answer a step up; Hänschen klein's is `rounded binary`, A A′ B A′.

```cells
&bar from "4/4" &tempo
&tempo step=free(100bpm, 80..120)
&key from ionian C
&harm from "vamp to the fifth" &key
&bassline from "root bass" &harm
&drums, &drumsOut from "drums performer" &drumlines
&bass, &bassOut from "bass performer" &bassline
&leadOut from "lead performer" &leadline
&kick step=2n &bd:0:.5
&backbeat step=2n [~ &sd:0:.35]
&hat step=4n &hh:0:.18
&drumlines [&kick, &backbeat, &hat]
&bandNote label="The band: a vamp of the tonic and the fifth and the root bass from the library, and the plainest beat, the piece's own." about=(&drumlines &harm &bassline)
```

## The tunes, in pieces

Each line is a motif of the library's, a bar of eighths over the key.
The forms put them together: `ternary` takes Twinkle's call and names its answer, and makes its bridge of the answer a step up, *up above the world so high*; `rounded binary` takes Hänschen klein's call and names its open answer, its close and its bridge, which it plays twice, the second time a step up, *hat ja nun kein Hänschen mehr*.

```cells
&twinkle from twinkle &key
&wonder from wonder &key
&haenschen from haenschen &key
&hinein from hinein &key
&heim from heim &key
&weinet from weinet &key
&twinkleSong from ternary(answer=&wonder) &twinkle
&haenschenSong from "rounded binary"(answer=&hinein, close=&heim, bridge=&weinet) &haenschen
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
