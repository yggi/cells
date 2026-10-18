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
&clave step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!5
&percussion map=midi(10) [&clave * .5]
&claves s=sine loop=D7 env=&(map=adsr 0 .06 0 .03)
```

The bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off the beat and sparser than its drum bar: five strokes in two bars.

Five strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). Its names (`&clave`, `&percussion`, `&claves`) are none of the drum bars', so it layers on any of them in one text.
