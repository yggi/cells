---
id: bass
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 0.25
    facet: instrument
source: seed
---

```cells
&bassV loop=C2
```

The voice the bass lines play through (decision 054, rung 7's first; #244): `&bassV`, whose `loop=C2` sets the register, so the lines' MIDI notes on Jambot's bass channel are the notes they were when each line carried its own `&bassV loop=C2`.
It has no sound of its own (`s=`): the lines go out on a MIDI card, which sends notes and not a sound, and says so of a voice that has one; a bass that sounds in a built-in synth comes with a card that plays it.
It defines the one voice the five bass lines read and uses nothing, so it fills their hole on any workbench; the lines no longer carry a voice of their own.

Associated as the kit is, once as the facet `instrument` at the centre of style space, at a quarter of its weight, so a query for an instrument finds the kit first; the composer asks for the bass by its id.
