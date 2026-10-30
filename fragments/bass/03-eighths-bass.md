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
&bassline from &harm
&bassline over=&harm step=8n 0!8
```

Jambot's bass pattern `eight`: the root of the chord in force on every eighth (`bass.ts` weighs the downbeat 1, the bar's half 0.9, the others 0.8).
Its own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.

At a point where the eighths' share of `bass.ts`'s blend is greatest, 0.63: full energy and no sync (the eighths weigh `0.6 × energy × (1 − funk)`, the funk line weighs the sync), and no pump (legato, or a harmony that moves fully).
The eighths are what `bass.ts` plays most at no preset, so unlike the others they sit at no preset's point (#209).
Techno, the preset where their share is greatest (0.24), is as near two of those points (Techno legato, and Techno with its harmony moving), so it sits at the root bass's point with the energy at 1: there `bass.ts` moves from the root alone to the eighths by the energy alone.

What `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, off the downbeat; the thinning by the energy (here 1.15: each eighth sounds but about one in twelve); the octave, the voice leading and the velocity, the performer's.

**Its signature** (decision 065): `&bassline from &harm`. `&bassline from "eighths bass" &harm` takes a copy of it, `&harm` its main argument. Taken the old way, `use &bassline from "eighths bass"`, it reads `&harm` by name, as before.
