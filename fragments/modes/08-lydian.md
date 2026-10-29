---
id: lydian
association:
  - point:
      sync: 0.15
      harm: 0.6
      artic: 0.15
      energy: 0.3
    weight: 1
    facet: mode
source: seed
---

```cells
&key scale(lydian, &tonic)
```

The major with a raised fourth: film music's and dream pop's mode, bright and floating, its II a major chord a whole tone above the tonic.
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic E`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole, as the other modes leave theirs.

No preset of Jambot's plays it yet (yggi/jambot#516). Placed by hand where it is heard, floating: on the beat, rich, legato and quiet (sync .15, harm .6, artic .15, energy .3), weight 1.
