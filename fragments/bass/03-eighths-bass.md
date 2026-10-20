---
id: eighths bass
association:
  - point:
      sync: 0
      harm: 0.3
      artic: 0
      energy: 1
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

```cells
&bass over=&harm step=8n 0!8
&bassV loop=C2
&bassOut map=midi(2) [&bass * &bassV]
```

Jambot's bass pattern `eight`: the root of the chord in force on every eighth (`bass.ts` weighs the downbeat 1, the bar's half 0.9, the others 0.8).
Its own lines read the host's `&harm` and tap the host's main meter; its card sends it on Jambot's bass channel, 2.

At a point where the eighths' share of `bass.ts`'s blend is greatest, 0.63: full energy and no sync (the eighths weigh `0.6 × energy × (1 − funk)`, the funk line weighs the sync), and no pump (legato, or a harmony that moves fully).
Techno, the preset where their share is greatest (0.24), is as near two of those points (Techno legato, and Techno with its harmony moving), so it sits at the root bass's point with the energy at 1: there `bass.ts` moves from the root alone to the eighths by the energy alone.

What `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, off the downbeat; the thinning by the energy (here 1.15: each eighth sounds but about one in twelve); the octave, the voice leading and the velocity, the performer's.
