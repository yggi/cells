---
id: weinet
association:
  - point:
      sync: 0.1
      harm: 0.12
      drive: 0.575
      bright: 0.875
    weight: 1
    facet: motif
source: seed
---

```cells
&weinet from &key
&weinet over=&key step=8n 1 1 1 1 1 2 3@2
```

Hänschen klein's middle, *aber Mutter weinet sehr*: the second five times and a step up to the fourth, held; a step up (`&weinet^1`) it is the next line, *hat ja nun kein Hänschen mehr*. The tune's bridge. A traditional tune, in the public domain.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&weinet`), so `&weinet from weinet &key` takes it; a form reads it as one of its lines (`&call step=8n &weinet`).

At `haenschen`'s point 0.1 higher in articulation, weight 1, as the facet `motif`.

**Its signature** (decision 065): `&weinet from &key`. `&weinet from weinet &key` takes a copy of it, `&key` its main argument.
