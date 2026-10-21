---
id: dorian
association:
  - point:
      sync: 0.35
      harm: 0.55
      artic: 0.65
      energy: 0.65
    weight: 1
    facet: mode
  - point:
      sync: 1
      harm: 0.12
      artic: 0.85
      energy: 0.75
    weight: 1
    facet: mode
source: seed
---

```cells
&key scale(dorian, free(C))
```

The minor with a major sixth: the key Jambot's composer plays at Deep house's and Funk's points (`PRESETS`' `mode`, yggi/jambot packages/engine/src/style.ts).
It defines `key`, the piece's main key (decision 047's interface name, decision 056), and uses nothing, so it fits any workbench that has no key yet; the harmonies and the bass lines read it (`over=key`, then `over=&harm`).
The tonic is left to the host, `free(C)`: a number left to the performer, which Jambot's key plan sets as it moves; C is `scale(…)`'s own default.

At the point of each preset that plays it, weight 1, so a query for the mode at one of them finds dorian first, at distance 0.
