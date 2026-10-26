---
id: root bass
association:
  - point:
      sync: 0
      harm: 0.3
      artic: 0
      energy: 0
    weight: 1
    facet: bass
  - point:
      sync: 0.3
      harm: 0.45
      artic: 0.55
      energy: 0.55
    weight: 1
    facet: bass
  - point:
      sync: 0.35
      harm: 0.55
      artic: 0.65
      energy: 0.65
    weight: 1
    facet: bass
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.2
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

```cells
&bassline over=&harm step=2n 0 0
```

Jambot's bass pattern `root`: the root of the chord in force on one and on three, the bar's downbeat and its half (`bass.ts` weighs them 1 and 0.6).
Its own lines read the host's `&harm` (`over=&harm`: each index a tone of the chord sounding) and tap the host's main meter, so it fits any workbench whose `&bar` and `&harm` are written first; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.

At the point where the root is all `bass.ts` plays: there its blend weighs the pump, the eighths and the funk line 0 (no sync, no energy, legato), so the root's share is 1.
Of the points where it is 1, this is the nearest to Ambient's, the preset where the root's share is greatest (0.68): Ambient's harmony, its sync and energy at 0.
It is also at the three presets where the root is what `bass.ts` plays most, as the meters are at theirs (#209): Synth-pop's (0.32, the funk line 0.27), Deep house's (0.31, tied with the funk line, which the root takes as first in `bass.ts`'s order) and Ambient's (0.68). A preset plays a blend, and its nearest pattern's point needn't be the pattern it plays most.

What `bass.ts` adds that a fixed line doesn't: on three it plays the fifth one section in five and an octave up one in four, by a draw per section and step; it thins the line by the energy (each step sounds when a held draw falls under its weight times 0.55 + 0.6 × energy); the octave, the voice leading and the velocity are the performer's.
