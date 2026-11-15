---
id: wail
source: seed
---

```cells
&wail from &key style=&(map=style sync=.2 harm=.9 bite=.27 mood=.3)
&wail over=&key step=8n 4@3 3#@2 3@3
```

A held note that sags: the fifth held, then a semitone lower and a semitone lower again, as a ghost's moan bends down (A, G♯, G in D harmonic minor).
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&wail`), so `use &wail` takes it; a form reads it as its `&call` (`&call step=8n &wail`), the line the form moves and answers.
Near Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.03 lower in bite (#674: its energy offset, #572, would put it on `lament`'s point, 0.05 lower; its articulation above `lament`'s keeps them apart, as on the old axes), weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.

**Its signature** (decision 065): `&wail from &key`. `&wail from wail &key` takes a copy of it, `&key` its main argument.
