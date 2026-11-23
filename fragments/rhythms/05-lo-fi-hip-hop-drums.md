---
id: lo_fi_hip_hop_drums
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=&(map=style sync=.5 harm=.75 bite=.35)
&bd, &rim, &sd, &hh from gm_kit
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=(&(map=style sync=.5 harm=.75 bite=.35) | &tripHop) facet=fill
&kick role=kick step=16n &bd:0:.524769 ~ ~ &bd:0:.286689 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~
&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.12555 &sd:0:.321409 &sd:0:.358113
&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.041912 ~ ~ ~ ~ ~ ~ ~ ~
&hat role=hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.253953 ~ ~ ~ &hh:0:.2232 ~ &hh:0:.215822 ~
&euclid role=euclid step=1m &rim(5,16,4)
&euclidLevel from metric_accent(floor=.16, peak=.23)
&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]
```

Jambot's E31 bar for Lo-fi hip hop (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Lo-fi hip hop's point. The rim's Euclid taps `1m`, and under a swung meter its strokes lean on the sixteenths the meter leans, as the band's rim does (#121).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `lo_fi_hip_hop_drums(bd=&mine)`.

**Its euclid's levels** are the bar's metric accents (`&euclidLevel from metric_accent(floor=.16, peak=.23)`, #799), the downbeat strongest: written by a built-in plugin-fragment, no longer the velocities Jambot's band wrote in E31's bar, which lay between the same two. The rest of the bar is E31's word for word.

**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point and at tripHop, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from lo_fi_hip_hop_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).
