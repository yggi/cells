---
id: pad_performer
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
&pad, &padOut from (&padLevel) &padline
&padV from pad
&padOut play=&padline level=&padLevel &padV
&pad map=role &padOut
&padLevel map=amp .8
```

The pad player (decisions 058 and 061): a gate, `&padOut` (Jambot's section text's name for it), whose role is `pad` (`&pad map=role &padOut`), playing the part `&padline` on the `pad` instrument, at its register (`&padV loop=C3`, where Jambot's section text sounds its comp: `PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&padline`, the line, and `&padLevel`, its velocities as written, a line of levels or one level.

Associated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): `&pad, &padOut from (&padLevel) &padline`. `&pad from pad_performer &line` takes a copy of it, `&padline` its main argument; `&padLevel` an optional parameter, its line its default (`"pad_performer"(padLevel=…)`).
