---
id: arpeggio
association:
  - point:
      sync: 0.5
      harm: 0.3
      artic: 0.5
      energy: 0.5
    weight: 1
    facet: motif
source: seed
---

```cells
&arpeggio from &key
&arpeggio over=&key step=8n 0 2 4 7 4 2 0 ~
```

Up the triad to the octave and back down: the plainest line a chord gives. General-purpose, for plainer harmony.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&arpeggio`), so `use &arpeggio` takes it; a form reads it as its `&call` (`&call step=8n &arpeggio`), the line the form moves and answers.

At the centre, 0.2 lower in harmony (#369), weight 1, as the facet `motif`.

**Its signature** (decision 064): `&arpeggio from &key`. `&arpeggio from arpeggio &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &arpeggio from arpeggio`, it reads `&key` by name, as before.
