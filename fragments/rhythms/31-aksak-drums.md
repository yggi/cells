---
id: aksak_drums
source: seed
---

```cells
&kick, &ghost, &backbeat, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.8 harm=.6 bite=1) * .75
&bd, &sd, &hh from gm_kit
&kick role=kick step=beat &bd:0:.6 ~ ~
&ghost role=ghost step=beat ~ &sd:0:.12 ~
&backbeat role=backbeat step=beat ~ ~ &sd:0:.5
&hat role=hat step=pulse &hh:0:.3
&groove [&kick, &ghost, &backbeat, &hat]
```

A drum bar for an aksak, a bar of three unequal beats, twos and a three: the kick on the first beat, a ghost of the snare on the second, the snare on the third, and the hat on every eighth.
It is written in the meter's counts, `step=beat` and `step=pulse`, so it lays itself out in whatever grouping the host's meter has: in 7/8 as the family reads it, `meter("7/8")`, 3 + 2 + 2, the snare falls on the sixth eighth and the kick's beat is the long one; in `meter("2+2+3")`, the grouping of the motif `limp`, the snare falls on the fifth and the long beat is the snare's.
Under a meter that swings its eighths (`swing=8n:2/3`), the hats of each two lean and those of the three stay even (decision 071); the beats never move.
Its lines are named by Jambot's drum roles (`kick`, `ghost`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.
Its three-beat lines lap a bar of three beats, so it fits the meters of three beats (7/8, 3/4) and no other.
Written by hand for [Aksak: twos and a three](../../examples/aksak.md), at 7/8's point (sync .8, harm .6, bite 1), weight 0.75 as the meter's own point there, as the facet `rhythm` (#646): where the meter fragment answers 7/8 (`meter(grouping=meter("7/8"))`), this is its drum bar.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `aksak_drums(bd=&mine)`.
