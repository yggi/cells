---
id: refrain
association:
  - point:
      sync: 0.3
      harm: 0.45
      artic: 0.55
      energy: 0.65
    weight: 1
    facet: motif
source: seed
---

```cells
&refrain from &key
&refrain over=&key step=8n 2 2 2 4@2 3 2 0
```

The refrain under the hook: the third three times, up to the fifth and held, then stepping down home. Written by hand for Synth-pop's minor (aeolian), a sung line that lands where the hook only asks.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&refrain`), so `use &refrain` takes it; a form reads it as its `&call` (`&call step=8n &refrain`), the line the form moves and answers.

Near Synth-pop's point, 0.1 higher in energy, so a query there finds `hook` first and this one 0.05 away (#369), weight 1, as the facet `motif`.

**Its signature** (decision 065): `&refrain from &key`. `&refrain from refrain &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &refrain from refrain`, it reads `&key` by name, as before.
