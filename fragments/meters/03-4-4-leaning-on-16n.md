---
id: 4/4 leaning on 16n
association:
  - point:
      sync: 0.5
      harm: 0.75
      artic: 0.35
      energy: 0.5
    weight: 1
    facet: meter
source: seed
---

```cells
&bar from (&swing) &tempo
&bar meter("4/4") step=&tempo swing=&swing
&swing swing=16n:.65
```

Jambot's swing .45: the sixteenths' heaviest lean of the presets. At Lo-fi hip hop's point.
Its tempo is the text's: `step=&tempo` reads a cell the text that uses it writes, a rate alone (`&tempo step=104bpm`, #290).
Its swing is its own, `&swing swing=16n:.65`, a cell that is a swing alone (#308), which the meter reads (`swing=&swing`): a helper `use &bar from …` takes with it, and a text that swings otherwise names it to override it (`use &bar, &swing from …` and its own `&swing swing=8n:free(.64, .5..0.75)`, decision 059).

**Its signature** (decision 064): `&bar from (&swing) &tempo`. `&bar from "4/4 leaning on 16n" 120bpm` takes a copy of it, `&tempo` its main argument; `&swing` an optional parameter, its line its default (`"4/4 leaning on 16n"(swing=…)`). Taken the old way, `use &bar from "4/4 leaning on 16n"`, it reads `&tempo` by name, as before.
