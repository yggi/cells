---
id: five_to_twelve
association:
  - facet: law
runtime: builtin
source: seed
---

```cells
&cycle from &day
&cycle law=fiveto12 over=&day step=84bpm
```

The 5 to 12 cycle (decision 085): a day of music, anchored to the clock at 11:55, every note computed by a law. A piece takes it from the clock it reads, its main argument: `&cycle from five_to_twelve &day`, where `&day` is a day meter (`&day scan(1!24) loop=1d anchor=11.55`). Its head's attributes before `from` are the piece's (`&cycle label="the law: a day" from five_to_twelve &day`).

**A built-in plugin-fragment** (decision 090): a fragment file like any, its code a module of cells (`src/engine/fiveto12.ts`, `runtime: builtin`, its law's word `fiveto12`; the id is `five_to_twelve`, since the example *5 to 12* is `fiveto12` and pieces and fragments share one namespace), which writes its fills as braid text: degrees over its key, chords stacked in thirds, its levels and places as cells, its sections the day's twelve blocks. Until rung 6 of #691 plays fills in a piece's expansion, its block is its head's line, `law=fiveto12`, the old spelling a piece no longer writes.

Its kind is `law`, and it has no style: a day of every mode is no style's, so no query finds it, and a piece takes it by its name (decision 090).
