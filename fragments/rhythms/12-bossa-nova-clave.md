---
id: bossa_nova_clave
source: seed
---

```cells
&clave, &percussion from (&claves) style=&(map=style sync=.8 harm=.85 bite=.35)
&claves from gm_kit
&clave role=clave step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!5
&percussion [&clave * .5]
```

The bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off the beat and sparser than its drum bar: five strokes in two bars.

Its five strokes are `even(5, 16, 2)`, as even as five go over sixteen (here sixteen eighths over two bars): a maximally even necklace, as the cinquillo is over eight and the son and rumba claves are not (decision 072; `even.test.ts`).

Five strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `bossa_nova_clave(claves=&mine)`.
