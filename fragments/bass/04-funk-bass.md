---
id: funk bass
association:
  - point:
      sync: 1
      harm: 0.12
      artic: 0.85
      energy: 0.75
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

```cells
&bass over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~
&bassNext over=&harm[>>] 0
&bassV loop=C2
&bassOut map=midi(2) [&bass * &bassV]
```

Jambot's bass pattern `funk`, its line on 4/4's sixteen steps, every step it weighs (`bass.ts`'s `FUNK`: 1, 0.7, 0.8, 0.4, 0.7, 0.5, 0.3, 0.8): the root of the chord in force, and on the bar's last two sixteenths the next chord's root, anticipated (`&bassNext`, over `&harm[>>]`).
Its own lines read the host's `&harm` and tap the host's main meter; its card sends it on Jambot's bass channel, 2.

At Funk's point: there the funk line's share of `bass.ts`'s blend is the greatest it gets, 0.74 (full sync weighs it 1 and the pump and the eighths 0), and Funk is the preset where its share is greatest.
At full sync `bass.ts` anticipates the next chord nine times in ten on a step of the bar's last three that isn't a change (`0.9 × sync`), so this line plays the anticipation.

What `bass.ts` adds that a fixed line doesn't: the tenth time, the root or the fifth there; the fifth one step in five and an octave up one in four elsewhere off the downbeat; the thinning by each step's weight and the energy (here 1: the 0.3 and the 0.4 sound about one section in three); the octave, the voice leading and the velocity, the performer's.
