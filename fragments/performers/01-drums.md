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
use "core kit"
&kit &bd &rim &sd &cp &lt &hh &ph &mt &oh &ht &cr &rd &claves
&drums play=&groove &kit
```

The drummer (decision 058): a gate named `drums`, so its role is `drums`, playing the part `&groove` on the core kit.
`&groove` is the hole the score fills: numbers on the kit's 13 members, in the core kit's order (`&kit`: 0 the kick, 2 the snare, 5 the closed hat …), each hit with its own gain where it isn't 1 (`[0:.55, 5:.28]`), as Jambot's drum lines strike its voices today (`&bd:0:.55`). The gain is the hit's velocity as the composer wrote it, so the gate has no `level=` of its own.
Over MIDI each member sends its General MIDI drum note by its name (`gmDrumNote`), as the kit's voices do in a groove, so the drums send what they send today on the channel the score's card gives them (Jambot's 10).

Associated as the facet `performer` at each of Jambot's eight presets' points (`presets.ts`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.
