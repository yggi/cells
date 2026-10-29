---
id: celesta
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/spooky.md @ 6d1bfa7
---

```cells
&keysV s=sine loop=C3 env=&(map=adsr .002 .7 0 .5)
```

Spooky's bell, a celesta's struck tone: a sine that starts at once and dies away over most of a second with nothing held, the music box in the attic.
It defines `&keysV`, the voice the stab performer plays (`use &keysV from keys`), so it fills the same hole as the default `keys`.
It is [Spooky, in pieces](../../examples/spooky.md)'s `&keysV` but for its register: `loop=C3`, the default instrument's, so a stab played on it sends the MIDI notes it sends on `keys`. The example plays it at `loop=C5`, where a celesta sits; a player who wants it there says so on its gate (`play=&stabline^$24`, decision 058).
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (`SPOOKY`: sync .2, harm .9, artic .3, energy .35; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
