---
id: locrian
association:
  - point:
      sync: 0.9
      harm: 1
      artic: 0.6
      energy: 0.9
    weight: 1
    facet: mode
source: seed
---

```cells
&key scale(locrian, &tonic)
```

The mode whose tonic is a diminished chord, its fifth flattened: the least settled of the seven, heard in metal's riffs and in jazz over a half-diminished chord.
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic E`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole, as the other modes leave theirs.

No preset of Jambot's plays it yet (yggi/jambot#516). Placed by hand at an edge of the space, frantic: off the beat, the harmony at its richest, clipped and loud (sync .9, harm 1, artic .6, energy .9), weight 1, so no preset's neighbourhood finds it before its own mode.
