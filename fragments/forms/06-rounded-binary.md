---
id: rounded_binary
source: seed
---

```cells
&song from (&answer, &close, &bridge) &call style=&(map=style sync=.1 harm=.12 bite=.6) * .5
&song step=8n &call &answer &call &close &bridge &bridge^1 &call &close
&answer step=8n &call^1
&close step=8n &call^-2
&bridge step=8n &call^-3
```

The rounded binary song, A A′ B A′, as Hänschen klein has it: the call and its open answer, the call and its closing answer, a bridge and the bridge a step up, then the call and its close again. Its hole is `&call`; `&answer` (the call a step up), `&close` (two degrees down) and `&bridge` (three down) are its helpers. A piece names them to override them: `&song from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen` is Hänschen klein whole.
With a one-bar call it is 8 bars, with a two-bar call 16.
It taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &song`), or a piece splices it where it likes.
At the tune's own point, not the centre of style space (#371): a children's song's form, as the facet `form`, at weight 0.5, so its distance counts double and it is found first only near the tune, not at a preset's point the centre's forms are nearer to (Techno, Ambient).

**Its signature** (decision 065): `&song from (&answer, &close, &bridge) &call`. `&song from rounded_binary &motif` takes a copy of it, `&call` its main argument; &answer, &close, &bridge optional parameters, their lines their defaults.
