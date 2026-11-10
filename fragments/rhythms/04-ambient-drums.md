---
id: ambient_drums
association:
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh)
&bd, &sd, &hh from gm_kit
&kick step=16n &bd:0:.513423 ~ ~ ~ ~ ~ ~ ~ &bd:0:.502201 ~ ~ ~ ~ ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd:0:.386943 ~ ~ ~ ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~
&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.0992 &sd:0:.136958 &sd:0:.167648 &sd:0:.194432 ~ &sd:0:.303801 &sd:0:.416889 &sd:0:.396801
&hat step=16n &hh:0:.238328 ~ &hh:0:.174158 ~ &hh:0:.261951 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.201438 ~ &hh:0:.261951 ~ &hh:0:.2232 ~
&groove [&kick, &backbeat, &fill, &hat]
```

Jambot's E31 bar for Ambient (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Ambient's point.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `ambient_drums(bd=&mine)`.
