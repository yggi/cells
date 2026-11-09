---
id: stab_performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      drive: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      drive: 0.9
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      drive: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      drive: 0.1
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      drive: 0.425
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      drive: 0.8
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      drive: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      drive: 0.45
    weight: 1
    facet: performer
source: seed
---

```cells
&stab, &stabOut from (&stabLevel) &stabline
&keysV from keys
&stabOut play=&stabline level=&stabLevel &keysV
&stab map=role &stabOut
&stabLevel map=amp .8
```

The stab player (decisions 058 and 061): a gate, `&stabOut` (Jambot's section text's name for it), whose role is `stab` (`&stab map=role &stabOut`), playing the part `&stabline` on the `keys` instrument, at its register (`&keysV loop=C3`, where Jambot's section text sounds its comp: `PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&stabline`, the line, and `&stabLevel`, its velocities as written, a line of levels or one level. Jambot sends the pad and the stab on one channel, 3: the score's card puts both gates in one entry (`[&padOut, &stabOut]`).

Associated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): `&stab, &stabOut from (&stabLevel) &stabline`. `&stab from stab_performer &line` takes a copy of it, `&stabline` its main argument; `&stabLevel` an optional parameter, its line its default (`"stab_performer"(stabLevel=…)`).
