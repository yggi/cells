---
id: drums performer
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
&drums from (&kit) &drumlines
&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit
&kit &bd &rim &sd &cp &lt &hh &ph &mt &oh &ht &cr &rd &claves
&drumsOut play=&drumlines &kit
&drums map=role &drumsOut
```

The drummer (decisions 058 and 061, #287): a gate, `&drumsOut` (named as Jambot's section text names its gates), whose role is `drums` (`&drums map=role &drumsOut`), playing the part `&drumlines` on 13 of the General MIDI kit's voices, which it takes by name.
The part is a stack of lines, one per role, as Jambot's section text writes its drums (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b, `drumLines`): `&drumlines [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]`.
A gate plays a stack line by line, each as if it were its one line, so every hit still says which line struck it (`kit:voices:kick:…`), the drum role the feel reads (`contracts/feel` v1.1).
Each line names its own voices, and a hit its level either way, as Strudel has it: its own gain (`&bd:0:.645 ~ ~ &bd`, `s("bd:0:.645 ~ ~ bd")`), or the line times a line of levels in the stack (`&euclid * &euclidLevel`, `s("rim(7,16)").gain("…")`), read at each note's written step, so a straight Euclid under a swung meter keeps its levels, and a number (`&clave * .5`). So the drummer has no level of its own, and its one hole is the score's: `&drumlines`.
Its kit is the drummer's own set-up of those 13 voices, the kick, the side stick, the snare, the clap, three toms, the closed, pedal and open hats, the crash, the ride and the claves, a table (`&kit`): a line that strikes a voice the kit doesn't hold is an error.

Associated as the facet `performer` at each of Jambot's eight presets' points (`presets.ts`), at weight 1: every preset's section text plays its drums the same way, on these 13 voices on channel 10, so the eight share this one drummer, and what a preset's drums sound like is its lines, not its player.

**Its signature** (decision 065): `&drums from (&kit) &drumlines`. `&drums from "drums performer" &groove` takes a copy of it, `&drumlines` its main argument; `&kit` an optional parameter, its line its default (`"drums performer"(kit=…)`). Taken the old way, `use &drums from "drums performer"`, it reads `&drumlines` by name, as before.
