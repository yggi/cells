---
id: bossa nova clave
association:
  - point:
      sync: 0.8
      harm: 0.85
      artic: 0.45
      energy: 0.35
    weight: 1
    facet: rhythm
source: seed
---

```cells
&clave step=16n cycle=2 &rs ~!5 &rs ~!5 &rs ~!7 &rs ~!5 &rs ~!5
&claves map=midi(10) [&clave * .5]
&rs s=white
```

The bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off the beat and sparser than its drum bar: five strokes in two bars.

Five strokes struck as a side stick (`&rs`, General MIDI's 37), as a drummer plays the clave on a kit, at half the level (velocity 90). Its names (`&clave`, `&claves`, `&rs`) are none of the drum bars', so it layers on any of them in one text.
