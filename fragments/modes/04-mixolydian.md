---
id: mixolydian
association:
  - point:
      sync: 0.875
      harm: 0.485
      artic: 0.65
      energy: 0.6
    weight: 1
    facet: mode
source: seed
---

```cells
&key scale(mixolydian, free(C))
```

The major with a minor seventh: the fourth of the composer's modes (`COMPOSER_MODES`, yggi/jambot packages/engine/src/key.ts), which no preset plays.
It defines `key`, the piece's main key (decision 047's interface name, decision 056), and uses nothing, so it fits any workbench that has no key yet; the harmonies and the bass lines read it (`over=key`, then `over=&harm`).
The tonic is left to the host, `free(C)`: a number left to the performer, which Jambot's key plan sets as it moves; C is `scale(…)`'s own default.

Between the major and the dorian minor (it shares the major's third and the dorian's seventh), it sits halfway between Funk's point (dorian) and Bossa nova's (ionian), where the son clave 3-2 sits too: the funk and rock of a major key with a flat seventh. It is the nearest mode there only, since each preset's own mode is at distance 0 at its point.
