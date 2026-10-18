---
id: rumba clave 3-2
association:
  - point:
      sync: 1
      harm: 0.2
      artic: 0.75
      energy: 0.8
    weight: 1
    facet: rhythm
source: seed
---

```cells
&clave step=16n cycle=2 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!3 &claves ~!7
&percussion map=midi(10) [&clave * .5]
&claves s=sine loop=D7 env=&(map=adsr 0 .06 0 .03)
```

The rumba clave, 3-2: the son's third stroke an eighth later, off the beat; drums and voices over a static harmony, short and dense: near Funk.

Five strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). Its names (`&clave`, `&percussion`, `&claves`) are none of the drum bars', so it layers on any of them in one text.
