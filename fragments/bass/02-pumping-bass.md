---
id: pumping bass
association:
  - point:
      sync: 0
      harm: 0
      artic: 1
      energy: 0
    weight: 1
    facet: bass
  - point:
      sync: 0.12
      harm: 0
      artic: 1
      energy: 0.8
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

```cells
&bassline over=&harm step=8n ~ 0 ~ 0 ~ 0 ~ 0
```

Jambot's bass pattern `pump`: the root of the chord in force on the eighth after each beat, and nothing on the beat, not even on a chord change (`bass.ts` plays the new root on a change only while the pump weighs under 0.45).
Its own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.

At the one point where the pump's share of `bass.ts`'s blend is greatest, 0.74: a static vamp, staccato, no sync (each a factor of the pump: `(1 − harm) × artic × (1 − sync)`), and no energy, which would bring in the eighths.
That is Techno's harmony and articulation, its sync and energy at 0.
It is also at Techno's, the preset where the pump is what `bass.ts` plays most (0.50), as the meters are at theirs (#209).

What `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, by a draw per section and step; the thinning by the energy (here 0.55: each offbeat sounds about one section in two); the octave, the voice leading and the velocity, the performer's.
