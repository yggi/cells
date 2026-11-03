---
id: Nursery drums
association:
  - point:
      sync: 0.1
      harm: 0.12
      artic: 0.5
      energy: 0.35
    weight: 1
    facet: rhythm
source: seed
---

```cells
&kick step=2n &bd:0:.5
&backbeat step=2n [~ &sd:0:.35]
&hat step=4n &hh:0:.18
&groove [&kick, &backbeat, &hat]
```

The plainest beat there is, for a children's song: the kick on one and three, the snare on two and four, a closed hat on every beat, nothing off it.
The kick and the snare cycle on a half note and the hat on a beat, so in 4/4 it is one bar, and in 3/4 or 5/4 the kick and the snare take turns on the halves of each bar.
Its lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.
Written by hand for the point proposed for a preset of children's songs (`NURSERY`, `presets.ts`: sync .1, harm .12, artic .5, energy .35), weight 1, where Twinkle's motifs and forms sit: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041).
