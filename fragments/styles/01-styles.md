---
id: styles
association:
  - point:
      sync: 0.3
      harm: 0.45
      artic: 0.55
      energy: 0.55
    weight: 1
    facet: style
  - point:
      sync: 0.12
      harm: 0
      artic: 1
      energy: 0.8
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 0.55
      artic: 0.65
      energy: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.05
      harm: 0.3
      artic: 0
      energy: 0.2
    weight: 1
    facet: style
  - point:
      sync: 0.5
      harm: 0.75
      artic: 0.35
      energy: 0.5
    weight: 1
    facet: style
  - point:
      sync: 1
      harm: 0.12
      artic: 0.85
      energy: 0.75
    weight: 1
    facet: style
  - point:
      sync: 0.75
      harm: 0.85
      artic: 0.45
      energy: 0.45
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 1
      artic: 0.3
      energy: 0.6
    weight: 1
    facet: style
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: style
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 1
    facet: style
source: seed
---

```cells
&synthPop map=style sync=.3 harm=.45 artic=.55 energy=.55
&techno map=style sync=.12 harm=0 artic=1 energy=.8
&deepHouse map=style sync=.35 harm=.55 artic=.65 energy=.65
&ambient map=style sync=.05 harm=.3 artic=0 energy=.2
&lofi map=style sync=.5 harm=.75 artic=.35 energy=.5
&funk map=style sync=1 harm=.12 artic=.85 energy=.75
&bossaNova map=style sync=.75 harm=.85 artic=.45 energy=.45
&swingJazz map=style sync=.35 harm=1 artic=.3 energy=.6
&electroSwing map=style sync=.55 harm=.75 artic=.6 energy=.75
&spooky map=style sync=.2 harm=.9 artic=.3 energy=.35
```

The styles of Jambot's ten presets (decision 063 §3, #391), each a `map=style` cell at the point the preset plays, its axes by name (cells' table of axes, `AXES`): the eight of the prototype, then Electro swing and Spooky (#349). A score names its section's style by one of them where the section sits exactly on it, and by its numbers or a mix of them where it doesn't:

```text
&funk from styles
&style label="Funk" style=&funk
```

The default band reads the style through `&style` (`band`: its bass's and its lead's cutoff), and so does its choice of instruments (`resolveBand`): Spooky's, named, plays the round bass, the organ, the celesta and the theremin, as its numbers do.

The points are Jambot's (`src/repository/presets.ts`, lifted from yggi/jambot `packages/engine/src/style.ts`), and a test holds the two to each other. Associated once at each of them, as the facet `style`, at weight 1: the style nearest a point is a query (`{ facet: 'style' }`).
