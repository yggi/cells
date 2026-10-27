---
id: 4/4 leaning faintly on 16n
association:
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.2
    weight: 1
    facet: meter
source: seed
---

```cells
&bar meter("4/4") step=&tempo swing=&swing
&swing swing=16n:31/60
```

Jambot's swing .05: 31/60, an onset a thirtieth of a sixteenth late. At Ambient's point.
Its tempo is the text's: `step=&tempo` reads a cell the text that uses it writes, a rate alone (`&tempo step=104bpm`, #290).
Its swing is its own, `&swing swing=16n:31/60`, a cell that is a swing alone (#308), which the meter reads (`swing=&swing`): a helper `use &bar from …` takes with it, and a text that swings otherwise names it to override it (`use &bar, &swing from …` and its own `&swing swing=8n:free(.64, .5..0.75)`, decision 059).
