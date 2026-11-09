---
id: slap
association:
  - point:
      sync: 1
      harm: 0.12
      drive: 0.85
      bright: 0.5
    weight: 1
    facet: motif
source: seed
---

```cells
&slap from &key
&slap over=&key step=8n 0 0 ~ 6 0 ~ 4 ~
```

The tonic twice, the flat seventh off the beat, the tonic, then the fifth: short and syncopated, the bass player's lick taken up by the lead. Written by hand for Funk's dorian.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&slap`), so `use &slap` takes it; a form reads it as its `&call` (`&call step=8n &slap`), the line the form moves and answers.

Near Funk's point, 0.05 higher in drive, so a query there finds `riff` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&slap from &key`. `&slap from slap &key` takes a copy of it, `&key` its main argument.
