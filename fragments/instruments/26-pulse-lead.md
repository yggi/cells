---
id: pulse_lead
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

```cells
* from style=&chiptune * .125
&leadV s=pulse loop=C4 env=&(map=adsr .002 .05 .8 .05)
```

The lead of [Korobeiniki, in Tetris form](../../examples/korobeiniki.md): a pulse wave, struck and held, the voice of an 8-bit console's sound chip. The example draws a pulse of a quarter's width from a braid of its own; `s=pulse` is the voice's.
It defines `&leadV`, the voice the lead performer plays.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #542).
