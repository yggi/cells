---
id: blues_horn
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

```cells
&leadV s=saw loop=C4 lpf=1600 room=.3 env=&(map=adsr .02 .15 .6 .12)
```

The horn of [Swing blues](../../examples/jazz.md): a saw softened by a low-pass, a little room on it, a brass line's attack.
It defines `&leadV`, the voice the lead performer plays.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #542).
