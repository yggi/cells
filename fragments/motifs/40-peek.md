---
id: peek
association:
  - point:
      sync: 0.3
      harm: 0.9
      artic: 0.3
      energy: 0.3
    weight: 1
    facet: motif
source: seed
---

```cells
&peek from &key
&peek over=&key step=8n ~ 0 1b 0 ~ ~ -1 0
```

Something peeks and hides: a rest, the tonic and the flat second above it and back, a silence, then the leading note below and the tonic (D E♭ D, C♯ D): the semitones on either side of home, the boo that comes when the back is turned.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&peek`), so `use &peek` takes it; a form reads it as its `&call` (`&call step=8n &peek`), the line the form moves and answers.
Its two rests are written apart (`~ ~`), not held (`~@2`), which plays the same: cells' vary reads no line with a held rest, so it would offer no variation of it, and the recogniser no answer.
Near Spooky's point (sync .2, harm .9, artic .3, energy .35; yggi/jambot#517), 0.1 higher in sync and 0.05 lower in energy, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.

**Its signature** (decision 065): `&peek from &key`. `&peek from peek &key` takes a copy of it, `&key` its main argument.
