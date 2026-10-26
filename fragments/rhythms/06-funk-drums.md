---
id: Funk drums
association:
  - point:
      sync: 1
      harm: 0.12
      artic: 0.85
      energy: 0.75
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick step=16n &bd:0:.645049 ~ ~ &bd:0:.386943 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~
&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.180792 &sd:0:.367599 &sd:0:.447951
&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.089528 ~ ~ ~ ~ ~ ~ ~ ~
&hat step=16n &hh:0:.348751 ~ &oh:0:.253953 ~ &hh:0:.330399 &hh:0:.114638 &oh:0:.230702 ~ &hh:0:.312543 ~ ~ ~ &hh:0:.286689 &hh:0:.104222 &oh:0:.215822 ~
&euclid step=1m [&rim:0:.253953 ~ ~ &rim:0:.270073 ~ &rim:0:.270073 ~ &rim:0:.230702 ~ ~ &rim:0:.278319 ~ &rim:0:.270073 ~ &rim:0:.295183 ~]
&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid]
```

Jambot's E31 bar for Funk (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Funk's point. The rim's Euclid taps `1m`, so it stays straight under a swung meter (#121).
Each rim stroke carries its own gain as Strudel writes it (`&rim:0:.27`), written out on the bar's sixteen sixteenths rather than as a Euclid with a line of levels beside it: a level line stepped on `16n` swings under a swung meter while the rim doesn't, so it read the step before (a velocity of 1), and the drums performer plays lines, not a line times its levels (#287).
