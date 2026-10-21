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
&key scale(aeolian, free(C))
```

The natural minor: the key Jambot's composer plays at Synth-pop's, Techno's and Lo-fi hip hop's points (`PRESETS`' `mode`, yggi/jambot packages/engine/src/style.ts), and the mode it opens in (`INITIAL_KEY`, A aeolian).
It defines `key`, the piece's main key (decision 047's interface name, decision 055), and uses nothing, so it fits any workbench that has no key yet; the harmonies and the bass lines read it (`over=key`, then `over=&harm`).
The tonic is left to the host, `free(C)`: a number left to the performer, which Jambot's key plan sets as it moves; C is `scale(…)`'s own default.

At the point of each preset that plays it, weight 1, so a query for the mode at one of them finds aeolian first, at distance 0.
