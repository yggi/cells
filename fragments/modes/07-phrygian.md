---
id: phrygian
association:
  - point:
      sync: 0.6
      harm: 0.6
      artic: 0.7
      energy: 0.85
    weight: 1
    facet: mode
source: seed
---

```cells
&key from &tonic
&key scale(phrygian, &tonic)
```

The minor with a minor second: the flamenco's and metal's mode, its ♭II a semitone above the tonic, a cadence that falls onto it (♭II–i).
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic E`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole, as the other modes leave theirs.

No preset of Jambot's plays it yet (the owner, 2026-10-29: "jambot should be able to play all 7 modes. they should all be fragments", yggi/jambot#516). Placed by hand where it is heard, dark and driven: off the beat, rich, clipped and loud (sync .6, harm .6, artic .7, energy .85), weight 1.

**Its signature** (decision 064): `&key from &tonic`. `&key from phrygian D` takes a copy of it, `&tonic` its main argument. Taken the old way, `use &key from phrygian`, it reads `&tonic` by name, as before.
