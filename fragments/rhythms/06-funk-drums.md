---
id: funk_drums
association:
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh, &oh)
&bd, &rim, &sd, &hh, &oh from gm_kit
&kick role=kick step=16n &bd:0:.645049 ~ ~ &bd:0:.386943 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~
&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.180792 &sd:0:.367599 &sd:0:.447951
&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.089528 ~ ~ ~ ~ ~ ~ ~ ~
&hat role=hat step=16n &hh:0:.348751 ~ &oh:0:.253953 ~ &hh:0:.330399 &hh:0:.114638 &oh:0:.230702 ~ &hh:0:.312543 ~ ~ ~ &hh:0:.286689 &hh:0:.104222 &oh:0:.215822 ~
&euclid role=euclid step=1m &rim(7,16,0)
&euclidLevel map=amp step=16n .253953 0 0 .270073 0 .270073 0 .230702 0 0 .278319 0 .270073 0 .295183 0
&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]
```

Jambot's E31 bar for Funk (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Funk's point. The rim's Euclid taps `1m`, and under a swung meter its strokes lean on the sixteenths the meter leans, as the band's rim does (#121).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `funk_drums(bd=&mine)`.
