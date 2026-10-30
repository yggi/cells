---
id: bass performer
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
&bass from (&bassLevel) &bassline
&bassV from bass
&bassOut play=&bassline^$-12 level=&bassLevel &bassV
&bass map=role &bassOut
&bassLevel map=amp .8
```

The bass player (decisions 058 and 061): a gate, `&bassOut` (Jambot's section text's name for it), whose role is `bass` (`&bass map=role &bassOut`), playing the part `&bassline` on the `bass` instrument an octave down.
The instrument holds the register, `&bassV loop=C2`, and Jambot's section text sounds its bass at C1 (`PIN_VOICES.bass`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so the gate moves the part 12 grid steps down (`^$-12`), and the bass sends the MIDI notes it sends today.
Its two inputs are the score's (decision 064: the line its main parameter, the level an optional one, one level of .8 by default): `&bassline`, the line (degrees over the chord in force or the key, held and shared as the section text writes them), and `&bassLevel`, its velocities as written: a line of levels (`map=amp step=16n`), or one level where they are all one (`&bassLevel map=amp .8`).

Associated as the facet `performer` at each of Jambot's eight presets' points (`presets.ts`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 064): `&bass from (&bassLevel) &bassline`. `&bass from "bass performer" &line` takes a copy of it, `&bassline` its main argument; `&bassLevel` an optional parameter, its line its default (`"bass performer"(bassLevel=…)`). Taken the old way, `use &bass from "bass performer"`, it reads `&bassline` by name, as before.
