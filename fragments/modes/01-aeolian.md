---
id: aeolian
association:
  - point:
      sync: 0.3
      harm: 0.45
      artic: 0.55
      energy: 0.55
    weight: 1
    facet: mode
  - point:
      sync: 0.12
      harm: 0
      artic: 1
      energy: 0.8
    weight: 1
    facet: mode
  - point:
      sync: 0.5
      harm: 0.75
      artic: 0.35
      energy: 0.5
    weight: 1
    facet: mode
source: seed
---

```cells
&key from &tonic
&key scale(aeolian, &tonic)
```

The natural minor: the key Jambot's composer plays at Synth-pop's, Techno's and Lo-fi hip hop's points (`PRESETS`' `mode`, yggi/jambot packages/engine/src/style.ts), and the mode it opens in (`INITIAL_KEY`, A aeolian).
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic D`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole: there is no default, since a default tonic plays a wrong key silently (#117); the performer's room, `free(…)`, is the tonic cell's to give (`&tonic free(…)`, not yet a form).

At the point of each preset that plays it, weight 1, so a query for the mode at one of them finds aeolian first, at distance 0.

**Its signature** (decision 064): `&key from &tonic`. `&key from aeolian D` takes a copy of it, `&tonic` its main argument. Taken the old way, `use &key from aeolian`, it reads `&tonic` by name, as before.
