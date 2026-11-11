---
id: cinquillo
association:
  - point:
      sync: 0.85
      harm: 0.6
      bite: 0.6
    weight: 1
    facet: rhythm
source: seed
---

```cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n &claves ~!3 &claves ~ &claves ~!3 &claves ~ &claves ~!3
&percussion [&clave * .5]
```

The cinquillo, x.xx.xx. over one bar of eighths: the Cuban danzón's rhythm, the habanera's and the tresillo's kin, five strokes as even as five go over eight, `even(5, 8, 2)` (2 1 2 1 2; decision 072). The tresillo is its three, `even(3, 8, 2)`, and the bossa nova clave its five over sixteen, `even(5, 16, 2)`: one generator, three timelines (#507).
It is written out, as the claves are, and a test states the identity (`rhythms.test.ts`): a rhythm struck from `even` by its phase, each hit a step long, is #531's.

Where it sits: no preset is Cuban. It is placed by hand beside the son clave, which grew out of the danzón (off the beat, sync 0.85), a little more harmonic (the danzón's ballroom chords, harm 0.6), and denser than a two-bar clave, five strokes in one bar (energy 0.6).

Five strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90), as the other claves: `&claves` is a hole the General MIDI kit fills (decision 054, rung 2: #244). Its other names (`&clave`, `&percussion`) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `cinquillo(claves=&mine)`.
