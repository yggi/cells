---
id: twinkle
association:
  - point:
      sync: 0.1
      harm: 0.12
      artic: 0.5
      energy: 0.35
    weight: 1
    facet: motif
source: seed
---

```cells
&twinkle from &key
&twinkle over=&key step=8n 0 0 4 4 5 5 4@2
```

Twinkle's first line, *twinkle, twinkle, little star*: the tonic twice, a leap to the fifth twice, the sixth twice and back to the fifth, held. The call of the tune, open on the fifth. A traditional tune, in the public domain.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&twinkle`), so `&twinkle from twinkle &key` takes it; a form reads it as one of its lines (`&call step=8n &twinkle`).

At the point proposed for a preset of children's songs (`KINDERLIED`, `styles`), weight 1, as the facet `motif`, so a query there finds it first.

**Its signature** (decision 065): `&twinkle from &key`. `&twinkle from twinkle &key` takes a copy of it, `&key` its main argument.
