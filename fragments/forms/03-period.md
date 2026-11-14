---
id: period
source: seed
---

```cells
&period from (&antecedent, &consequent) &call style=&(map=style sync=.15 harm=.4 bite=.3)
&period step=8n &antecedent &consequent
&antecedent step=8n &call &call^1
&consequent step=8n &call &call^-1
```

A period: an antecedent and a consequent, the same start, a different end. The antecedent ends a degree above the call (open), the consequent a degree below (closed). Its hole is `&call`; `&antecedent` and `&consequent` are its helpers, a piece's to override by naming them.
With a one-bar call it is 4 bars, with a two-bar call 8.
It taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &period`), or a piece splices it where it likes.
At `sync .15 harm .4 bite .3`, as the facet `form`, weight 1: where its idiom is, on the beat, a half cadence answered by a full one, sung legato, as in a classical period, a folk song and a lullaby (#371; the owner, 2026-11-09: "form follows idiom"). It names no mood: a form fits any. Of `styles`, Ambient and Dark ambient find it first (`npm run coverage -- --facet form`).

**Its signature** (decision 065): `&period from (&antecedent, &consequent) &call`. `&period from period &motif` takes a copy of it, `&call` its main argument; `&antecedent`, `&consequent` optional parameters, their lines their defaults (`period(antecedent=…)`).
