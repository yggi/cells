---
id: stab performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      artic: 0.55
      energy: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      artic: 1
      energy: 0.8
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      artic: 0.65
      energy: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.2
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      artic: 0.35
      energy: 0.5
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      artic: 0.85
      energy: 0.75
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      artic: 0.45
      energy: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      artic: 0.3
      energy: 0.6
    weight: 1
    facet: performer
source: seed
---

```cells
use &keysV from keys
&stabOut play=&stabline level=&stabLevel &keysV
&stab map=role &stabOut
```

The stab player (decisions 058 and 061): a gate, `&stabOut` (Jambot's section text's name for it), whose role is `stab` (`&stab map=role &stabOut`), playing the part `&stabline` on the `keys` instrument, at its register (`&keysV loop=C3`, where Jambot's section text sounds its comp: `PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.
Its two holes are the score's: `&stabline`, the line, and `&stabLevel`, its velocities as written, a line of levels or one level. Jambot sends the pad and the stab on one channel, 3: the score's card puts both gates in one entry (`[&padOut, &stabOut]`).

Associated as the facet `performer` at each of Jambot's eight presets' points (`presets.ts`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.
