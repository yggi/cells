---
id: bossa_nova_drums
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=&(map=style sync=.75 harm=.85 bite=.45)
&bd, &rim, &sd, &hh from gm_kit
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=&(map=style sync=.75 harm=.85 bite=.45) facet=fill
&kick role=kick step=16n &bd:0:.502201 ~ ~ &bd:0:.312543 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~ ~ ~ ~ ~ &sd:0:.427119 ~ ~ ~
&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.148862 &sd:0:.278319 &sd:0:.348751
&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.063488 ~ ~ ~ ~ ~ ~ ~ ~
&hat role=hat step=16n ~ ~ ~ ~ ~ ~ ~ ~ &hh:0:.246078 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.18755 ~
&euclid role=euclid step=1m &rim(5,16,4)
&euclidLevel from metric_accent(floor=.18, peak=.22)
&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]
```

Jambot's E31 bar for Bossa nova (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Bossa nova's point.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `bossa_nova_drums(bd=&mine)`.

**Its euclid's levels** are the bar's metric accents (`&euclidLevel from metric_accent(floor=.18, peak=.22)`, #799), the downbeat strongest: written by a built-in plugin-fragment, no longer the velocities Jambot's band wrote in E31's bar, which lay between the same two. The rest of the bar is E31's word for word.

**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from bossa_nova_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).
