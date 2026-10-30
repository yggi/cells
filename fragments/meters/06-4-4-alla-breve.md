---
id: 4/4 alla breve
association:
  - point:
      sync: 0.2
      harm: 0.6
      artic: 0.9
      energy: 1
    weight: 1
    facet: meter
source: seed
---

```cells
&bar from &tempo
&bar meter("4/4") step=&tempo beat=2
```

Alla breve: the bpm counts half notes; fast, bright, marching.
Its tempo is the text's: `step=&tempo` reads a cell the text that uses it writes, a rate alone (`&tempo step=104bpm`, #290).

**Its signature** (decision 064): `&bar from &tempo`. `&bar from "4/4 alla breve" 120bpm` takes a copy of it, `&tempo` its main argument. Taken the old way, `use &bar from "4/4 alla breve"`, it reads `&tempo` by name, as before.
