---
id: twelve_eight_drums
source: seed
---

```cells
&kick, &backbeat, &hat, &groove from (&bd, &sd, &rd) style=&(map=style sync=.7 harm=.6 bite=0)
&bd, &sd, &rd from gm_kit
&kick role=kick step=beat &bd:0:.6 ~ &bd:0:.45 ~
&backbeat role=backbeat step=beat ~ &sd:0:.5 ~ &sd:0:.5
&hat role=hat step=8n &rd:0:.35 &rd:0:.18 &rd:0:.24
&groove [&kick, &backbeat, &hat]
```

A slow blues in 12/8: four beats a bar, each a dotted quarter of three eighths; the kick on one and three, the snare on two and four, and the ride on every eighth, the first of each three the loudest, the second the softest.
The kick and the snare tap the beats (`step=beat`); the ride's three eighths make one beat of a compound meter, so it fits 12/8 alone of the library's meters (in 6/8 its four beats are two bars).
Under a meter bent on its eighths (`bend=8n:&lean`, decision 080), the ride leans as the bend says, within each beat; the beats never move.
Its lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`, the ride its hat as in `swing_jazz_drums`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&rd` 51), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.
Written by hand for [Twelve-eight: the lean of three](../../examples/twelve.md), at 12/8's point (sync .7, harm .6, bite 0), as the facet `rhythm` (#646): where the meter fragment answers 12/8 (`meter(grouping=meter("12/8"))`), this is its drum bar.
It weighs 1, as a seed point does: lock-in's witness that the walk files fragments of its own stands on a library with no rhythms, a gap no placement fills (#706), so it no longer needs this corner left empty, as it did when it weighed 0.25 (#646). No style's first rhythm changes at 1 against 0.25; between Trip-hop and Ambient, Lo-fi hip hop, Swing jazz or Blues shuffle it is now third.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `twelve_eight_drums(bd=&mine)`.
