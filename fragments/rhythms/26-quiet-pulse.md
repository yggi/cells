---
id: quiet_pulse
association:
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
    weight: 1
    facet: rhythm
source: seed
---

```cells
&tick, &groove from (&claves)
&claves from gm_kit
&tick role=clave step=4n &claves:0:.2
&groove [&tick]
```

A quiet pulse, the claves softly on every beat: what keeps a band together where the music has no drums, a baroque ensemble's beat felt more than heard.

At Baroque's point (sync .15, harm .8, bite .5), weight 1, as the facet `rhythm`, so a band at Baroque plays this and no other style's kit (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&tick2=tick`), and passes its own drum where it has one: `quiet_pulse(claves=&mine)`.
