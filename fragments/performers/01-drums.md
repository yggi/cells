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
use * from "core kit"
&kit &bd &rim &sd &cp &lt &hh &ph &mt &oh &ht &cr &rd &claves
&drums play=&drumlines &kit
```

The drummer (decision 058, #287): a gate named `drums`, playing the part `&drumlines` on the core kit.
The part is a stack of lines, one per role, as Jambot's section text writes its drums (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b, `drumLines`): `&drumlines [&kick, &backbeat, &fill, &ghost, &hat]`.
A gate plays a stack line by line, each as if it were its one line, so every hit still says which line struck it (`kit:voices:kick:…`), the drum role the feel reads (`contracts/feel` v1.1).
Each line names its own voices, and each hit its own gain, as Strudel writes it: `&bd:0:.645 ~ ~ &bd`, `s("bd:0:.645 ~ ~ bd")`. A stack holds lines and nothing else, no level beside a line (`&euclid * &euclidLevel`, Jambot's spelling today, is refused), so the drummer has no level of its own, and its one hole is the score's: `&drumlines`.
Its kit is the drummer's own set-up of the core kit's 13 voices, a table (`&kit`): a line that strikes a voice the kit doesn't hold is an error.

Associated as the facet `performer` at each of Jambot's eight presets' points (`presets.ts`), at weight 1: every preset's section text plays its drums the same way, on the core kit on channel 10, so the eight share this one drummer, and what a preset's drums sound like is its lines, not its player.
