---
id: call_and_answer
association:
  - point:
      sync: 0.75
      harm: 0.35
      bite: 0.65
    weight: 1
    facet: form
source: seed
---

```cells
&phrase from (&answer) &call
&phrase step=8n &call &answer
&answer step=8n &call^-2
```

The call and its answer: the call, then the call two degrees down, as blues and West African music answer a call, and as Jambot's lead lifts a line (an operator on the call, decision 052). Its hole is `&call`; `&answer` is its helper, an operator on the call by default, which a piece overrides by naming it (`use &phrase, &answer from call_and_answer`, decision 059).
With a one-bar call it is 2 bars, with a two-bar call 4.
It taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &phrase`), or a piece splices it where it likes.
At `sync .75 harm .35 bite .65`, as the facet `form`, weight 1: where its idiom is, a syncopated groove over a harmony that hardly moves, struck, as in funk, the blues, West African music and dance (#371; the owner, 2026-11-09: "form follows idiom"). It names no mood: a form fits any. Of `styles`, Funk and Acid find it first (`npm run coverage -- --facet form`).

**Its signature** (decision 065): `&phrase from (&answer) &call`. `&phrase from call_and_answer &motif` takes a copy of it, `&call` its main argument; `&answer` an optional parameter, its line its default (`"call_and_answer"(answer=…)`).
