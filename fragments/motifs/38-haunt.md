---
id: haunt
source: seed
---

```cells
&haunt from &key style=&(map=style sync=.15 harm=.9 bite=.25 mood=.3)
&haunt over=&key step=8n 2 4 6 9 6 4 2@2
```

The augmented triad on the third, up and back: the third, the fifth, the raised seventh, the third an octave up, and down again (F A C♯ F C♯ A F in D harmonic minor), each step a major third, so no note sounds like home.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&haunt`), so `use &haunt` takes it; a form reads it as its `&call` (`&call step=8n &haunt`), the line the form moves and answers.
Near Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in sync and bite, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.

**Its signature** (decision 065): `&haunt from &key`. `&haunt from haunt &key` takes a copy of it, `&key` its main argument.
