---
id: Spooky drums
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 1
    facet: rhythm
source: seed
---

```cells
&kick step=16n &bd:0:.55 &bd:0:.3 ~ ~
&hat step=4n &rd:0:.12
&euclid step=1m &rim(3,8,2)
&groove [&kick, &hat, &euclid * .25]
```

A heartbeat, a clock and a knock: the beat of [Spooky, in pieces](../../examples/spooky.md).
The kick is a heartbeat on every beat, its second stroke a sixteenth after the first and softer (lub-dub); the ride ticks each beat, faint, a clock; the rim knocks three times over the bar, Euclid's E(3,8) turned by two, so it never lands on the one.
Every line fits any meter: the kick and the ride cycle on a beat (`step=16n` four long, `step=4n` one long), and the rim spans the bar (`step=1m`), so in 5/4 the heart beats five times and the knocks spread over five beats.
Its lines are named by Jambot's drum roles (`kick`, `hat`, `euclid`) and strike only voices its kit holds (`&bd` 36, `&rd` 51, `&rim` 37), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.
Written by hand for the point proposed for a Spooky preset (sync .2, harm .9, artic .3, energy .35; #349), weight 1: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.
