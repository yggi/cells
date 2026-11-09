---
id: meter
association:
  - point:
      sync: 0.3
      harm: 0.45
      drive: 0.55
    weight: 1
    facet: meter
  - point:
      sync: 0.12
      harm: 0
      drive: 0.9
    weight: 1
    facet: meter
  - point:
      sync: 0.75
      harm: 0.85
      drive: 0.45
    weight: 1
    facet: meter
  - point:
      sync: 0.35
      harm: 1
      drive: 0.45
    weight: 1
    facet: meter
    args:
      swing: 8n:2/3
  - point:
      sync: 0.55
      harm: 0.75
      drive: 0.675
    weight: 1
    facet: meter
    args:
      swing: 8n:2/3
  - point:
      sync: 0.5
      harm: 0.75
      drive: 0.425
    weight: 1
    facet: meter
    args:
      swing: 16n:.65
  - point:
      sync: 0.35
      harm: 0.55
      drive: 0.65
    weight: 1
    facet: meter
    args:
      swing: 16n:.6
  - point:
      sync: 1
      harm: 0.12
      drive: 0.8
    weight: 1
    facet: meter
    args:
      swing: 16n:.6
  - point:
      sync: 0.05
      harm: 0.3
      drive: 0.1
    weight: 1
    facet: meter
    args:
      swing: 16n:31/60
  - point:
      sync: 0.2
      harm: 0.6
      drive: 0.95
    weight: 1
    facet: meter
    args:
      grouping: meter("2/2", 2)
  - point:
      sync: 0
      harm: 0.1
      drive: 0.8
    weight: 1
    facet: meter
    args:
      grouping: meter("2/4")
  - point:
      sync: 0
      harm: 0.7
      drive: 0.15
    weight: 1
    facet: meter
    args:
      grouping: meter("3/4")
  - point:
      sync: 0.2
      harm: 0.9
      drive: 0.365
    weight: 1
    facet: meter
    args:
      grouping: meter("3/4")
  - point:
      sync: 0.3
      harm: 0.2
      drive: 0.1
    weight: 1
    facet: meter
    args:
      grouping: meter("6/8")
  - point:
      sync: 0.2
      harm: 0.9
      drive: 0.285
    weight: 1
    facet: meter
    args:
      grouping: meter("6/8")
  - point:
      sync: 0.7
      harm: 0.6
      drive: 0.1
    weight: 1
    facet: meter
    args:
      grouping: meter("12/8")
  - point:
      sync: 0.4
      harm: 0.9
      drive: 0.4
    weight: 1
    facet: meter
    args:
      grouping: meter("5/4")
  - point:
      sync: 0.2
      harm: 0.9
      drive: 0.325
    weight: 1
    facet: meter
    args:
      grouping: meter("5/4")
  - point:
      sync: 0.8
      harm: 0.6
      drive: 1
    weight: 1
    facet: meter
    args:
      grouping: meter("7/8")
  - point:
      sync: 0.6
      harm: 0.9
      drive: 0.85
    weight: 1
    facet: meter
    args:
      grouping: meter("10/8")
source: seed
---

```cells
&bar from (&grouping, &swing) &tempo
&bar base=&grouping step=&tempo swing=&swing
&grouping meter("4/4")
&swing swing=8n:1/2
```

The one meter fragment (#507, decision 072): a bar `&bar` at the text's tempo, its grouping and its swing its arguments, each line its default: 4/4, straight.
Its points carry their arguments, one a style, so the style space's meters are this one list: `meter` itself at Synth-pop's, Techno's and Bossa nova's points; `meter(swing=8n:2/3)` at Swing jazz's and Electro swing's; the sixteenths leaning at Lo-fi's (`16n:.65`), at Deep house's and Funk's (`16n:.6`) and at Ambient's (`16n:31/60`); `meter(grouping=meter("5/4"))` at Spooky's, with 6/8 and 3/4 near it; 2/4, 7/8, 10/8, 12/8 and alla breve (`meter("2/2", 2)`) at points of their own.

**Its signature** (decision 065): `&bar from (&grouping, &swing) &tempo`. `&bar from meter 120bpm` takes 4/4; `&bar from meter(grouping=meter("7/8"), swing=8n:2/3) &tempo` a 7/8 swung on its pairs (its three straight, decision 071).
`&grouping` is a meter, read by `base=`: a copy of a meter is a meter (#507), so `&bar` is the grouping's meter at the tempo, swung as `&swing` says (a cell that is a swing alone, #308).
