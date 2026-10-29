---
id: vibrato
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 0.25
    facet: expression
source: seed
---

```cells
&vibrato map=lin loop=5 0 .1 0 -.1 0
```

A singer's or a string player's vibrato (#196): the pitch rising a tenth of a semitone above the note and falling as far below, five times a second, a voice's `pitch=` (`&lead s=saw loop=C4 pitch=&vibrato`).
It is the vibrato the examples wrote out most, `pitch=&(map=lin loop=5 0 .1 0 -.1 0)` in bossa, BWV 847 and pop and near it in six more (five to six a second, eight to fifteen hundredths of a semitone), which take it from here.
A drift that takes seconds to come round, a flutter, or a vibrato wider or slower on purpose is a piece's own: it writes its own cell, as spooky, baustelle and electroswing do.

It defines a cell and uses nothing, so it fits any workbench. Associated once, as the facet `expression`, at the centre of style space, at a quarter weight: what a voice does to its notes is no style's, and a query for an expression finds it there.
