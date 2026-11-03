---
id: haenschen
association:
  - point:
      sync: 0.1
      harm: 0.12
      artic: 0.6
      energy: 0.45
    weight: 1
    facet: motif
source: seed
---

```cells
&haenschen from &key
&haenschen over=&key step=8n 4 2 2@2 3 1 1@2
```

Hänschen klein's first line, *Hänschen klein, ging allein* (in English *Lightly row*): the fifth falling a third and held, then the fourth falling a third and held. The call of the tune. A traditional tune, in the public domain.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&haenschen`), so `&haenschen from haenschen &key` takes it; a form reads it as one of its lines (`&call step=8n &haenschen`).

At a point 0.1 from `NURSERY` on articulation and energy, a little shorter and denser than Twinkle, weight 1, as the facet `motif`.

**Its signature** (decision 065): `&haenschen from &key`. `&haenschen from haenschen &key` takes a copy of it, `&key` its main argument.
