---
id: stick_count
source: seed
---

```cells
&count from (&stick) &bar style=(&synthPop | &techno | &deepHouse | &lofi | &funk | &acid | &happyHardcore | &elektro | &chiptune | &tripHop | &march | &pop)
&stick=rim from gm_kit
&count from click(tick=&stick) &bar
```

The drummer's count: the sticks clicked together on each beat, the General MIDI side stick (`&stick=rim`), a bar of the meter's beats before the band comes in (#720). It is the click (`click`) on the player's sound: a click on every beat, each as strong as the meter's grouping makes it, so it counts any meter the piece writes, 7/8's three groups as 4/4's four beats.

At the styles whose drums are a kit played with sticks, the band's pop, electronic, hip-hop and funk, Pop itself among them (#947) (and March's snare line, which counts off on its rims), weight 1, as the facet `count`. A count is a bar, placed by the form: `[&count * &countIn]` with `&countIn map=amp step=1m 1 0@1000`, or before the piece by a frontend, as Jambot's count-in is (`countIn`, yggi/jambot packages/engine/src/ending.ts: one bar of the opening meter's beats at the opening tempo).

**Its signature** (decision 065): `&count from (&stick) &bar`, the meter its main argument. `&count from stick_count &bar` takes a copy of it; `stick_count(stick=&mine)` clicks a sound of the piece's own.
