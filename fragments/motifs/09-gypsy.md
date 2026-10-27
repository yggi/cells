---
id: gypsy
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/electroswing.md @ 7622a87
---

```cells
&gypsy over=&key step=8n 4 5 6 7@2 6 4@2
```

The clarinet's call of [Electro swing, in pieces](../../examples/electroswing.md): A B♭ C♯ D and back to A in D harmonic minor, the fifth climbing through the minor sixth and the leading note to the octave, gypsy jazz's run.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&gypsy`), so `use &gypsy` takes it; a form reads it as its `&call` (`&call step=8n &gypsy`), the line the form moves and answers.

At the point proposed for an Electro swing preset (sync 0.55, harm 0.75, artic 0.6, energy 0.75), as the example's other seeds are: Jambot's to adopt (decision 041).
