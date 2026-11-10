---
id: son_clave_2_3
association:
  - point:
      sync: 0.95
      harm: 0.35
      bite: 0.75
    weight: 1
    facet: rhythm
source: seed
---

```cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n cycle=2 ~!4 &claves ~!3 &claves ~!7 &claves ~!5 &claves ~!5 &claves ~!3
&percussion [&clave * .5]
```

The son clave from its other bar, 2-3: it starts off the downbeat, so it sits a step from 3-2 toward Funk, more off the beat and plainer.

It is not maximally even: no phase of `even(5, 16)` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (`even.test.ts`).

Five strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `son_clave_2_3(claves=&mine)`.
