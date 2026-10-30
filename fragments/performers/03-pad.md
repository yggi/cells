---
id: pad performer
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
&pad, &padOut from (&padLevel) &padline
&padV from pad
&padOut play=&padline level=&padLevel &padV
&pad map=role &padOut
&padLevel map=amp .8
```

The pad player (decisions 058 and 061): a gate, `&padOut` (Jambot's section text's name for it), whose role is `pad` (`&pad map=role &padOut`), playing the part `&padline` on the `pad` instrument, at its register (`&padV loop=C3`, where Jambot's section text sounds its comp: `PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.
Its two inputs are the score's (decision 064: the line its main parameter, the level an optional one, one level of .8 by default): `&padline`, the line, and `&padLevel`, its velocities as written, a line of levels or one level.

Associated as the facet `performer` at each of Jambot's eight presets' points (`presets.ts`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 064): `&pad, &padOut from (&padLevel) &padline`. `&pad from "pad performer" &line` takes a copy of it, `&padline` its main argument; `&padLevel` an optional parameter, its line its default (`"pad performer"(padLevel=…)`). Taken the old way, `use &pad from "pad performer"`, it reads `&padline` by name, as before.
