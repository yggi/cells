---
id: harmonic minor
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: mode
source: seed
lifted: yggi/cells examples/electroswing.md @ 2c120d4
---

```cells
&key scale(harmonic, free(C))
```

The minor with a raised seventh: the gypsy jazz key of [Electro swing, in pieces](../../examples/electroswing.md), whose vamp's fifth is then a major chord, a dominant (`[4,6,8]` over D is A C♯ E), and whose line over it is the fifth's phrygian dominant.
It defines `key`, the piece's main key (decision 047's interface name, decision 056), and uses nothing, so it fits any workbench that has no key yet; the harmonies and the bass lines read it (`over=key`, then `over=&harm`).
The tonic is left to the host, `free(C)`, as the other modes leave it.

At the point proposed for an Electro swing preset (`ELECTRO_SWING`, `src/repository/presets.ts`), weight 1; Jambot's composer has no harmonic minor among its modes yet (`COMPOSER_MODES`, yggi/jambot packages/engine/src/key.ts).
