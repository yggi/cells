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
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

```cells
&bass over=&harm step=2n 0 0
&bassV loop=C2
&bassOut map=midi(2) [&bass * &bassV]
```

Jambot's bass pattern `root`: the root of the chord in force on one and on three, the bar's downbeat and its half (`bass.ts` weighs them 1 and 0.6).
Its own lines read the host's `&harm` (`over=&harm`: each index a tone of the chord sounding) and tap the host's main meter, so it fits any workbench whose `&bar` and `&harm` are written first; its card sends it on Jambot's bass channel, 2.

At the point where the root is all `bass.ts` plays: there its blend weighs the pump, the eighths and the funk line 0 (no sync, no energy, legato), so the root's share is 1.
Of the points where it is 1, this is the nearest to Ambient's, the preset where the root's share is greatest (0.68): Ambient's harmony, its sync and energy at 0.

What `bass.ts` adds that a fixed line doesn't: on three it plays the fifth one section in five and an octave up one in four, by a draw per section and step; it thins the line by the energy (each step sounds when a held draw falls under its weight times 0.55 + 0.6 × energy); the octave, the voice leading and the velocity are the performer's.
