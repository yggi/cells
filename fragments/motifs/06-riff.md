---
id: riff
association:
  - point:
      sync: 1
      harm: 0.12
      drive: 0.8
      bright: 0.5
    weight: 1
    facet: motif
source: seed
---

```cells
&riff from &key
&riff over=&key step=8n 0 ~ 3 0 ~ 4 3 ~
```

A funk riff: the tonic, the fourth and the fifth, all off and on the beat in short strokes. Written by hand for Funk's dorian, at its most syncopated and staccato.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&riff`), so `use &riff` takes it; a form reads it as its `&call` (`&call step=8n &riff`), the line the form moves and answers.

At Funk's point (`styles`), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&riff from &key`. `&riff from riff &key` takes a copy of it, `&key` its main argument.
