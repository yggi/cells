---
id: meter
source: seed
---

```cells
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.1 harm=.12 bite=.5) | &(map=style sync=.45 harm=.05 bite=.85) | &(map=style sync=.25 harm=.45 bite=.8) | &(map=style sync=.15 harm=.5 bite=.85) | &(map=style sync=.35 harm=.15 bite=.4) | &(map=style sync=.15 harm=.8 bite=.5) | &(map=style sync=.1 harm=.25 bite=.7) | &(map=style sync=.3 harm=.7 bite=1) | &(map=style sync=.9 harm=.5 bite=.7) | &(map=style sync=.7 harm=.2 bite=.2))
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=.65 harm=.55 bite=.45) | &(map=style sync=.35 harm=1 bite=.3) | &(map=style sync=.55 harm=.75 bite=.6)) swing=8n:2/3
&bar from (&grouping, &swing) &tempo style=&(map=style sync=.5 harm=.75 bite=.35) swing=16n:.65
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.45 harm=.05 bite=.95) * .5) swing=16n:.6
&bar from (&grouping, &swing) &tempo style=&(map=style sync=.05 harm=.3 bite=0) swing=16n:31/60
&bar from (&grouping, &swing) &tempo style=&(map=style sync=.2 harm=.6 bite=.9) * .75 grouping=meter("2/2", 2)
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=0 harm=.1 bite=.6) * .75 | &(map=style sync=0 harm=.1 bite=.75) * .75) grouping=meter("2/4")
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=0 harm=.7 bite=.3) * .75 | &(map=style sync=.2 harm=.9 bite=.38) * .75) grouping=meter("3/4")
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=.3 harm=.2 bite=.2) * .75 | &(map=style sync=.2 harm=.9 bite=.22) * .75) grouping=meter("6/8")
&bar from (&grouping, &swing) &tempo style=&(map=style sync=.7 harm=.6 bite=0) * .75 grouping=meter("12/8")
&bar from (&grouping, &swing) &tempo style=(&(map=style sync=.4 harm=.9 bite=.5) * .75 | &(map=style sync=.2 harm=.9 bite=.3)) grouping=meter("5/4")
&bar from (&grouping, &swing) &tempo style=&(map=style sync=.8 harm=.6 bite=1) * .75 grouping=meter("7/8")
&bar from (&grouping, &swing) &tempo style=&(map=style sync=.6 harm=.9 bite=.8) * .75 grouping=meter("10/8")
&bar base=&grouping step=&tempo swing=&swing
&grouping meter("4/4")
&swing swing=8n:1/2
```

The one meter fragment (#507, decision 072): a bar `&bar` at the text's tempo, its grouping and its swing its arguments, each line its default: 4/4, straight.
Its points carry their arguments, one a style, so the style space's meters are this one list: `meter` itself at Synth-pop's, Techno's and Bossa nova's points; `meter(swing=8n:2/3)` at Swing jazz's and Electro swing's; the sixteenths leaning at Lo-fi's (`16n:.65`), at Deep house's and Funk's (`16n:.6`) and at Ambient's (`16n:31/60`); `meter(grouping=meter("5/4"))` at Spooky's, with 6/8 and 3/4 near it; 2/4, 7/8, 10/8, 12/8 and alla breve (`meter("2/2", 2)`) at points of their own.

**Its signature** (decision 065): `&bar from (&grouping, &swing) &tempo`. `&bar from meter 120bpm` takes 4/4; `&bar from meter(grouping=meter("7/8"), swing=8n:2/3) &tempo` a 7/8 swung on its pairs (its three straight, decision 071).
`&grouping` is a meter, read by `base=`: a copy of a meter is a meter (#507), so `&bar` is the grouping's meter at the tempo, swung as `&swing` says (a cell that is a swing alone, #308).

The meters placed for their own sake (2/2, 2/4, 3/4, 6/8, 12/8, 7/8, 10/8, and the 5/4 off Spooky's point) weigh 0.75, so each is still first where it was placed, and between two presets a preset's own meter is: on decision 076's axes a meter has three, and at weight 1 they crowded that space; at 0.5 they were chosen so rarely that their use stopped settling over a set (`lockin.slow.test.ts`) (#572).
