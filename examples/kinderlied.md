---
title: Kinderlieder, in pieces
tags: [genre:folk, diatonic, motifs, arrangement]
description: Twinkle and Hänschen klein, each tune's lines its own parts, each tune's shape a form, over a vamp of two chords, a root bass and the plainest beat.
parts:
  twinkle:
    association:
      - point:
          sync: 0.1
          harm: 0.12
          bite: 0.5
          mood: 0.95
        weight: 1
        facet: motif
  wonder:
    association:
      - point:
          sync: 0.1
          harm: 0.12
          bite: 0.4
          mood: 0.95
        weight: 1
        facet: motif
  haenschen:
    association:
      - point:
          sync: 0.1
          harm: 0.12
          bite: 0.65
          mood: 0.95
        weight: 1
        facet: motif
  hinein:
    association:
      - point:
          sync: 0.1
          harm: 0.12
          bite: 0.6
          mood: 0.95
        weight: 1
        facet: motif
  heim:
    association:
      - point:
          sync: 0.1
          harm: 0.12
          bite: 0.55
          mood: 0.95
        weight: 1
        facet: motif
  weinet:
    association:
      - point:
          sync: 0.1
          harm: 0.12
          bite: 0.7
          mood: 0.95
        weight: 1
        facet: motif
---

Two children's songs, the kind a learner plays first, made of the seed library's pieces.
Each tune is its lines, each a motif of one bar and a part this file gives (decision 082): Twinkle's call `&twinkle` and its answer `&wonder`; Hänschen klein's call `&haenschen`, its open answer `&hinein`, its close `&heim` and its bridge `&weinet`. Another piece takes one by its head, over its own key: `&twinkle from kinderlied &key`.
Each tune's shape is a form: Twinkle's is `ternary`, A B A, its bridge the answer a step up; Hänschen klein's is `rounded_binary`, A A′ B A′.
The band is the library's too: the plainest beat, `kinderlied_drums` (the kick on one and three, the snare on two and four, a closed hat on every beat), a vamp of two chords, the tonic for four bars and the fifth for four, and the root bass under it.

```cells
&bar from meter &tempo
&tempo step=free(100bpm, 80..120)
&key from diatonic(mode=ionian) C
&harm from vamp_to_the_fifth &key
&bassline from root_bass &harm
&drums, &drumsOut from drums_performer &drumlines
&bass, &bassOut from bass_performer(bassV=&bassV) &bassline
&leadOut from lead_performer(leadV=&leadV) &leadline
&kick, &backbeat, &hat from kinderlied_drums
&drumlines [&kick, &backbeat, &hat]
&bandNote label="The band: the Kinderlied beat, a vamp of the tonic and the fifth, the root bass, all from the library." about=(&drumlines &harm &bassline)
```

## The tunes, in pieces

Each tune is a part of this file: its signature (`&twinkle from &key`), then its line, a bar of eighths over the key. Opened, the piece plays them over its own `&key`; taken, a part plays over the key the taking line gives.
The forms put them together: `ternary` takes Twinkle's call and names its answer, and makes its bridge of the answer a step up, *up above the world so high*; `rounded_binary` takes Hänschen klein's call and names its open answer, its close and its bridge, which it plays twice, the second time a step up, *hat ja nun kein Hänschen mehr*.

```cells
&twinkle from &key
&twinkle over=&key step=8n 0 0 4 4 5 5 4@2
&wonder from &key
&wonder over=&key step=8n 3 3 2 2 1 1 0@2
&haenschen from &key
&haenschen over=&key step=8n 4 2 2@2 3 1 1@2
&hinein from &key
&hinein over=&key step=8n 0 1 2 3 4 4 4@2
&heim from &key
&heim over=&key step=8n 0 2 4 4 0@4
&weinet from &key
&weinet over=&key step=8n 1 1 1 1 1 2 3@2
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
