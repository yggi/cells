---
id: kinderlied_drums
association:
  - point:
      sync: 0.1
      harm: 0.12
      artic: 0.5
      energy: 0.35
    weight: 0.25
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
The kick and the snare cycle on a half note and the hat on a beat, so in 4/4 it is one bar, and in 3/4 or 5/4 the kick and the snare take turns on the halves of each bar; it fits every meter of the library's.
Its lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.
Written by hand for the point proposed for a Kinderlied preset (`KINDERLIED`, `presets.ts`: sync .1, harm .12, artic .5, energy .35), where Twinkle's and Hänschen klein's motifs sit; no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041).
At weight 0.25, as the dark cadence is weighted down (#404): its distance counts four times, so a query finds it within Jambot's miss distance (0.3) only within 0.075 of its point, where a Kinderlied preset finds it at distance 0.
Its weight was chosen against cells' lock-in bound when it was absolute, points added (#533 made it relative, and whether the weight goes back to 1 is #544's): both bounds on lock-in over rhythms (`lockin.slow.test.ts`) sat at their edge without it, 4.99 points against 5 and a spread of 2.48 against 2.5, so a rhythm that the walk away from the presets finds and learns crosses one or the other: at weight 1 the share learning adds rose to 5.55 points; at 0.5, 0.4 and 0.3 it was 5.06, 5.02 and 4.98, the last with a spread of 2.52; at 0.25 4.95 and 2.46. Three beats near it (this one, a march and a swaying one) raised it to 5.98, so this one stands alone.
