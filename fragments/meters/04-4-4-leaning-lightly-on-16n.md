---
id: 4/4 leaning lightly on 16n
association:
  - point:
      sync: 0.35
      harm: 0.55
      artic: 0.65
      energy: 0.65
    weight: 1
    facet: meter
  - point:
      sync: 1
      harm: 0.12
      artic: 0.85
      energy: 0.75
    weight: 1
    facet: meter
source: seed
---

```cells
&bar meter("4/4") step=&tempo swing=&swing
&swing swing=16n:.6
```

Jambot's swing .3. At Deep house's and Funk's points, whose swing is the same.
Its tempo is the text's: `step=&tempo` reads a cell the text that uses it writes, a rate alone (`&tempo step=104bpm`, #290).
Its swing is its own, `&swing swing=16n:.6`, a cell that is a swing alone (#308), which the meter reads (`swing=&swing`): a helper `use &bar from …` takes with it, and a text that swings otherwise names it to override it (`use &bar, &swing from …` and its own `&swing swing=8n:free(.64, .5..0.75)`, decision 059).
