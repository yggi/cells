---
id: period
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
&period step=8n &antecedent &consequent
&antecedent step=8n &call &call^1
&consequent step=8n &call &call^-1
```

A period: an antecedent and a consequent, the same start, a different end. The antecedent ends a degree above the call (open), the consequent a degree below (closed). Its hole is `&call`; `&antecedent` and `&consequent` are its helpers, a piece's to override by naming them.
With a one-bar call it is 4 bars, with a two-bar call 8.
It taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &period`), or a piece splices it where it likes.
At the centre of style space, as the facet `form`, weight 1: a form fits any style, and a query for one finds them in this order.
