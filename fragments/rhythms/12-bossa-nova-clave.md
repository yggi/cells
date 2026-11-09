---
id: bossa_nova_clave
association:
  - point:
      sync: 0.8
      harm: 0.85
      drive: 0.4
    weight: 1
    facet: rhythm
source: seed
---

```cells
&clave step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!5
&percussion [&clave * .5]
```

The bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off the beat and sparser than its drum bar: five strokes in two bars.

Its five strokes are `even(5, 16, 2)`, as even as five go over sixteen (here sixteen eighths over two bars): a maximally even necklace, as the cinquillo is over eight and the son and rumba claves are not (decision 072; `even.test.ts`).

Five strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is a hole, a sound the General MIDI kit fills with the line this fragment used to carry word for word (decision 054, rung 2: #244). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.
