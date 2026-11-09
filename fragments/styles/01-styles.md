---
id: styles
association:
  - point:
      sync: 0.3
      harm: 0.45
      drive: 0.55
      bright: 0.25
    weight: 1
    facet: style
  - point:
      sync: 0.12
      harm: 0
      drive: 0.9
      bright: 0.25
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 0.55
      drive: 0.65
      bright: 0.5
    weight: 1
    facet: style
  - point:
      sync: 0.05
      harm: 0.3
      drive: 0.1
      bright: 0.875
    weight: 1
    facet: style
  - point:
      sync: 0.5
      harm: 0.75
      drive: 0.425
      bright: 0.25
    weight: 1
    facet: style
  - point:
      sync: 1
      harm: 0.12
      drive: 0.8
      bright: 0.5
    weight: 1
    facet: style
  - point:
      sync: 0.75
      harm: 0.85
      drive: 0.45
      bright: 0.875
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 1
      drive: 0.45
      bright: 0.875
    weight: 1
    facet: style
  - point:
      sync: 0.55
      harm: 0.75
      drive: 0.675
      bright: 0.375
    weight: 1
    facet: style
  - point:
      sync: 0.2
      harm: 0.9
      drive: 0.325
      bright: 0.375
    weight: 1
    facet: style
  - point:
      sync: 0.1
      harm: 0.12
      drive: 0.425
      bright: 0.875
    weight: 1
    facet: style
source: seed
---

```cells
&synthPop map=style label="Synth-pop" step=108bpm sync=.3 harm=.45 drive=.55 bright=.25
&techno map=style label="Techno" step=130bpm sync=.12 harm=0 drive=.9 bright=.25
&deepHouse map=style label="Deep house" step=122bpm sync=.35 harm=.55 drive=.65 bright=.5
&ambient map=style label="Ambient" step=72bpm sync=.05 harm=.3 drive=.1 bright=.875
&lofi map=style label="Lo-fi hip hop" step=84bpm sync=.5 harm=.75 drive=.425 bright=.25
&funk map=style label="Funk" step=104bpm sync=1 harm=.12 drive=.8 bright=.5
&bossaNova map=style label="Bossa nova" step=132bpm sync=.75 harm=.85 drive=.45 bright=.875
&swingJazz map=style label="Swing jazz" step=148bpm sync=.35 harm=1 drive=.45 bright=.875
&electroSwing map=style label="Electro swing" step=124bpm sync=.55 harm=.75 drive=.675 bright=.375
&spooky map=style label="Spooky" step=100bpm sync=.2 harm=.9 drive=.325 bright=.375
&kinderlied map=style label="Kinderlied" step=96bpm sync=.1 harm=.12 drive=.425 bright=.875
```

The library of styles (decision 063 §3, #391, #537): the eleven preset styles, each a `map=style` cell at its point, its axes by name (cells' table of axes, `AXES`), its display name its `label=` and its default tempo its `step=`. They are Jambot's eight from the prototype, then Electro swing and Spooky (#349), then Kinderlied (yggi/jambot#547), whose 96 bpm is Twinkle's.

This file is the presets' one source: `STYLES` (`src/repository/styles.ts`) reads each as `{ id, name, point, tempo }`, in this order, and a frontend takes its presets from there. Only the library reads the `step=`: `style=` and a query read the point, so a style has no tempo (decision 037, D6).

A score names its section's style by one of them where the section sits exactly on it, and by its numbers or a mix of them where it doesn't:

```text
&funk from styles
&style label="Funk" style=&funk
```

The default band reads the style through `&style` (`band`: its bass's and its lead's cutoff), and so does its choice of instruments (`resolveBand`): Spooky's, named, plays the round bass, the organ, the celesta and the theremin, as its numbers do.

The points were lifted from yggi/jambot `packages/engine/src/style.ts` @ 7b078e8, with their tempos @ dcc414d. Associated once at each of them, as the facet `style`, at weight 1: the style nearest a point is a query (`{ facet: 'style' }`), and a test holds the association to the cells' points.
