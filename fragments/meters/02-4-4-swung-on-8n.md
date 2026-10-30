---
id: 4/4 swung on 8n
association:
  - point:
      sync: 0.35
      harm: 1
      artic: 0.3
      energy: 0.6
    weight: 1
    facet: meter
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: meter
source: seed
---

```cells
&bar from (&swing) &tempo
&bar meter("4/4") step=&tempo swing=&swing
&swing swing=8n:2/3
```

Jambot's swing 1: the triplet swing, 2/3, on the eighths; the sixteenths straight. At Swing jazz's point. A meter swung on `8n` brings in Jambot's jazz kit (yggi/jambot#360).
Its tempo is the text's: `step=&tempo` reads a cell the text that uses it writes, a rate alone (`&tempo step=104bpm`, #290).
Its swing is its own, `&swing swing=8n:2/3`, a cell that is a swing alone (#308), which the meter reads (`swing=&swing`): a helper `use &bar from …` takes with it, and a text that swings otherwise names it to override it (`use &bar, &swing from …` and its own `&swing swing=8n:free(.64, .5..0.75)`, decision 059).
Also at the point proposed for an Electro swing preset (sync .55, harm .75, artic .6, energy .75; #349), weight 1: the meter [Electro swing, in pieces](../../examples/electroswing.md) plays, there with its own lighter swing, .64. Without it a query there finds 10/8.

**Its signature** (decision 064): `&bar from (&swing) &tempo`. `&bar from "4/4 swung on 8n" 120bpm` takes a copy of it, `&tempo` its main argument; `&swing` an optional parameter, its line its default (`"4/4 swung on 8n"(swing=…)`). Taken the old way, `use &bar from "4/4 swung on 8n"`, it reads `&tempo` by name, as before.
