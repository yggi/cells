---
id: sentence
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 1
    facet: form
source: seed
---

```cells
&sentence from (&continuation) &call
&sentence step=8n &call &call^1 &continuation
&continuation step=8n inverse(&call) &call[::-1]
```

Caplin's sentence: a presentation, the idea and the idea moved a degree up, then a continuation as long, here the idea mirrored (`inverse(&call)`) and the idea backwards (`&call[::-1]`), the material broken up as a continuation does. Its hole is `&call`; `&continuation` is its helper, a piece's to override by naming it.
With a one-bar call it is 4 bars, with a two-bar call 8.
It taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &sentence`), or a piece splices it where it likes.
At the centre of style space, as the facet `form`, weight 1: a form fits any style, and a query for one finds them in this order.

**Its signature** (decision 065): `&sentence from (&continuation) &call`. `&sentence from sentence &motif` takes a copy of it, `&call` its main argument; `&continuation` an optional parameter, its line its default (`sentence(continuation=…)`). Taken the old way, `use &sentence from sentence`, it reads `&call` by name, as before.
