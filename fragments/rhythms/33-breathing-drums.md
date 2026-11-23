---
id: breathing_drums
source: seed
---

```cells
&kick, &hat, &hatLevel, &groove from (&bd, &hh) style=&(map=style sync=.15 harm=.35 bite=.1)
&bd, &hh from gm_kit
&kick role=kick step=16n &bd:0:.45 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&hatLevel from metric_accent(density=.75, sync=.2, peak=.3, floor=.12)
&hat role=hat step=16n &hh
&groove [&kick, &hat * &hatLevel]
```

A breathing pulse beside Ambient (#799): one soft kick a bar, and hats whose levels are the bar's metric weights (`metric_accent`, a built-in plugin-fragment), not written by hand: the downbeat and the half bar strongest, the beats lighter, each leaning a little toward the step before it (`sync=.2`), the off-eighths and the sixteenth before each beat played, the other sixteenths left out (`density=.75`).

**Its signature** (decision 075): its lines are its heads, and the drums it strikes (`&bd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default (`&bd, &hh from gm_kit`). `&hatLevel` is the accent line, a head of its own, the groove plays the hat's hits at its levels (`&hat * &hatLevel`), as the funk groove plays its euclid's, and a piece can lay it over another line (`&myHat * &hatLevel`).
