---
id: bar
source: seed
---

```cells
&bar from (&meter) &tempo style=(&synthPop | &techno | &ambient | &bossaNova | &kinderlied | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &seaShanty | &chiptune | &salsa | &tripHop)
&bar from (&meter) &tempo style=(&waltz * .75 | [&spooky + &(map=style bite=.08)] * .75) meter="3/4"
&bar from (&meter) &tempo style=(&march * .75 | &(map=style sync=0 harm=.1 bite=.6) * .75) meter="2/4"
&bar from (&meter) &tempo style=(&(map=style sync=.3 harm=.2 bite=.2) * .75 | [&spooky + &(map=style bite=-.08)] * .75) meter="6/8"
&bar from (&meter) &tempo style=&(map=style sync=.7 harm=.6 bite=0) * .75 meter="12/8"
&bar from (&meter) &tempo style=&(map=style sync=.2 harm=.6 bite=.9) * .75 meter="4/4 in 2"
&bar meter(&meter) step=&tempo
&meter "4/4"
```

The bar: the common meters, straight (#902, decision 103). `&bar` is the meter its text argument writes (`meter(&meter)`, a text cell, decision 101) at the text's tempo: `&bar from bar &tempo` is 4/4, `&bar from bar(meter="3/4") &tempo` a waltz's bar, `&bar from bar(meter="4/4 in 2") &tempo` alla breve (decision 102). Its swing is the head's, set where a use writes it (`&bar swing=8n:2/3 from bar &tempo`, decision 065 §4); a style's own feel is a fragment of its own that takes this one (`funk_meter`, `swing_meter`, `lofi_meter`), and the odd groupings are `odd_meter`.

**Its signature** (decision 065): `&bar from (&meter) &tempo`, `&tempo` its main argument, `meter=` a text, any `meter("…")` reads.

Its points name the styles it is at (decision 099: a meter's `&funk` is Funk's sync, harm and bite), so the style space's straight 4/4 is the fourteen styles of the first line, Ambient's among them, its sixteenths' lean of 31/60 dropped (the owner, 2026-11-23). 3/4 is at Waltz's point and beside Spooky's (+.08 bite), 6/8 at a point of its own and beside Spooky's (−.08), 2/4 at March's and its own, 12/8 and alla breve at points of their own.

The meters placed for their own sake, and those beside a style, weigh 0.75, so each is still first where it was placed, and between two presets a preset's own meter is: on decision 076's axes a meter has three, and at weight 1 they crowded that space; at 0.5 they were chosen so rarely that their use stopped settling over a set (`lockin.slow.test.ts`) (#572).
