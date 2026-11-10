---
id: swing_jazz_drums
association:
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick, &backbeat, &fill, &ghost, &hat, &pedal, &groove from (&bd, &sd, &ph, &rd)
&bd, &sd, &ph, &rd from gm_kit
&kick role=kick step=16n &bd:0:.559551 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&backbeat role=backbeat step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~
&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.109368 &sd:0:.386943 &sd:0:.367599
&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.030008 &sd:0:.0558 ~ ~ ~ ~ ~ ~ ~
&hat role=hat step=16n &rd:0:.295183 ~ ~ ~ &rd:0:.278319 ~ ~ ~ &rd:0:.230702 ~ ~ ~ &rd:0:.253953 ~ &rd:0:.215822 ~
&pedal role=pedal step=16n ~ ~ ~ ~ &ph:0:.161262 ~ ~ ~ ~ ~ ~ ~ &ph:0:.201438 ~ ~ ~
&groove [&kick, &backbeat, &fill, &ghost, &hat, &pedal]
```

Jambot's E31 bar for Swing jazz (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Swing jazz's point.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&ph`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &ph, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `swing_jazz_drums(bd=&mine)`.
