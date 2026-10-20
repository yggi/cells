---
id: walking bass
association:
  - point:
      sync: 0.35
      harm: 1
      artic: 0.3
      energy: 0.6
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

```cells
&bass over=&harm step=4n 0 1 2 &bassNext^$-1
&bassNext over=&harm[>>] 0
&bassV loop=C2
&bassOut map=midi(2) [&bass * &bassV]
```

Jambot's bass pattern `walk`, a note on every beat: the root of the chord in force on one, its third and its fifth, and on the last beat the next chord's root a semitone below (`&bassNext^$-1`: the next chord's root, `over=&harm[>>]`, moved a step of the grid, a semitone).
The semitone can't be an index: over the chord in force an accidental moves a degree of the key, so `0b` over `&harm[>>]` is a semitone only where the key's degree below the next root is one.
Its own lines read the host's `&harm` and tap the host's main meter; its card sends it on Jambot's bass channel, 2.

At Swing jazz's point, under its meter swung on `8n` (`4/4 swung on 8n`): `bass.ts` walks only where the meter swings its eighths (`eighthSwing`) and the harmony moves (`harm ≥ 2/3`), and there the walk's share of its blend is the greatest it gets, 0.74, the funk line, the pump and the eighths all 0.
The swing is the meter's, not a style axis, so the point says only the harmony.

What `bass.ts` draws that a fixed line chooses: the second and third beats each the third, the fifth or the seventh (the fifth twice over where the chord has none), a third each, so this line is one walk it plays, up through the chord; the approach from below or above, half each, so this one from below. Under a harmony that changes on the bar's half it leads into that change too. The octave, the voice leading and the velocity are the performer's.
