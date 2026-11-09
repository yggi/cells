---
id: pulse
association:
  - point:
      sync: 0.12
      harm: 0
      drive: 0.95
      bright: 0.25
    weight: 1
    facet: motif
source: seed
---

```cells
&pulse from &key
&pulse over=&key step=8n 0 ~ 0 ~ 2 ~ 0 ~
```

The tonic struck on every beat and the third once, all short: a line that is mostly rhythm, as a techno lead is. Written by hand for Techno, where the harmony stands still.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&pulse`), so `use &pulse` takes it; a form reads it as its `&call` (`&call step=8n &pulse`), the line the form moves and answers.

Near Techno's point, 0.05 higher in drive, so a query there finds `octaves` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&pulse from &key`. `&pulse from pulse &key` takes a copy of it, `&key` its main argument.
