---
id: deep_house_drums
source: seed
lifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8
---

```cells
&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.35 harm=.55 bite=.65)
&bd, &sd, &hh from gm_kit
&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.35 harm=.55 bite=.65) facet=fill
&kick role=kick step=16n &bd:0:.595449 ~ ~ ~ ~ ~ ~ ~ &bd:0:.571393 ~ ~ ~ ~ ~ ~ ~
&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.502201 ~ ~ ~ ~ ~ ~ ~ &sd:0:.491103 ~ ~ ~
&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.339513 &sd:0:.406783
&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~
&hat role=hat step=16n &hh:0:.321409 ~ &hh:0:.253953 ~ &hh:0:.303801 ~ ~ ~ &hh:0:.286689 ~ ~ ~ &hh:0:.261951 &hh:0:.094302 &hh:0:.230702 ~
&groove [&kick, &backbeat, &fill, &ghost, &hat]
```

Jambot's E31 bar for Deep house (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Deep house's point.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `deep_house_drums(bd=&mine)`.

**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from deep_house_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).
