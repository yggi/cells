---
id: bass_performer
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
&bass, &bassOut from (&bassLevel) &bassline
&bassV from bass
&bassOut play=&bassline^$-12 level=&bassLevel &bassV
&bass map=role &bassOut
&bassLevel map=amp .8
```

The bass player (decisions 058 and 061): a gate, `&bassOut` (Jambot's section text's name for it), whose role is `bass` (`&bass map=role &bassOut`), playing the part `&bassline` on the `bass` instrument an octave down.
The instrument holds the register, `&bassV loop=C2`, and Jambot's section text sounds its bass at C1 (`PIN_VOICES.bass`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so the gate moves the part 12 grid steps down (`^$-12`), and the bass sends the MIDI notes it sends today.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&bassline`, the line (degrees over the chord in force or the key, held and shared as the section text writes them), and `&bassLevel`, its velocities as written: a line of levels (`map=amp step=16n`), or one level where they are all one (`&bassLevel map=amp .8`).

Associated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): `&bass, &bassOut from (&bassLevel) &bassline`. `&bass from bass_performer &line` takes a copy of it, `&bassline` its main argument; `&bassLevel` an optional parameter, its line its default (`"bass_performer"(bassLevel=…)`).
