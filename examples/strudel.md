---
title: "Strudel's spelling: laps, slow and euclid"
tags: [tutorial, rhythm]
tier: 4
description: "A tune and a beat in Strudel's own spelling: an alternation, a slowed group, a euclid on a step and a note's length as a share."
---

Strudel's mini-notation is cells' step language (decision 027): a spelling the two share keeps Strudel's meaning, so a pattern written there can be pasted here.
`<0 2 4>` is an **alternation**: one of its steps each lap of the cell, in turn. `[0 2]/2` is **slow**: the group stretched over two laps, 0 on one and 2 on the next. `&bd(3,8)` is a **euclid on a step**: three hits spread as evenly as they go over eight parts of the step, turned right by a third number, as Strudel's `bd(3,8,2)`.
`legato=` is a line's articulation, Strudel's too: each note sounds its written length times this share, .5 staccato, 1 as written, 1.5 into the next.

```cells
&altNote label="<0 2 4> plays one step each lap of the cell, in turn: the first lap 0, the next 2, then 4. <5 [7 9]> alternates a step with a group." about=&tune
&slowNote label="[0 2]/2 spreads its group over two laps: 0 on the first, 2 on the second." about=&tune
&legatoNote label="legato=.5: every note sounds half its written length, a staccato; 1 would be as written." about=&tune
&euclidNote label="&bd(3,8) is three kicks spread over the eight parts of its step; &hh(5,8,2) five hats, turned two to the right." about=&beat
&bar from meter &tempo
&tempo step=free(moderato)

&tune legato=.5 step=4n 0 <2 4 7> [0 2]/2 <5 [7 9]>
&beat step=2n &bd(3,8) &hh(5,8,2)

&bd, &hh from gm_kit
&pluck s=tri loop=C4 env=&(map=adsr .005 .3 .1 .2)
&out map=sample postgain=3 [&tune * &pluck * .3, &beat * .5]
```
