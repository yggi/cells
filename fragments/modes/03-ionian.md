---
id: ionian
association:
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.2
    weight: 1
    facet: mode
  - point:
      sync: 0.75
      harm: 0.85
      artic: 0.45
      energy: 0.45
    weight: 1
    facet: mode
  - point:
      sync: 0.35
      harm: 1
      artic: 0.3
      energy: 0.6
    weight: 1
    facet: mode
source: seed
---

```cells
&key scale(ionian, &tonic)
```

The major: the key Jambot's composer plays at Ambient's, Bossa nova's and Swing jazz's points (`PRESETS`' `mode`, yggi/jambot packages/engine/src/style.ts).
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic D`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole: there is no default, since a default tonic plays a wrong key silently (#117); the performer's room, `free(…)`, is the tonic cell's to give (`&tonic free(…)`, not yet a form).

At the point of each preset that plays it, weight 1, so a query for the mode at one of them finds ionian first, at distance 0.
The bell and scale (`05-bell-and-scale.md`) is ionian too, elsewhere.
