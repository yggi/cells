---
id: lead_performer
source: seed
---

```cells
&lead, &leadOut from (&leadLevel, &leadV, &style) &leadline style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))
&leadV from lead(style=&style)
&leadOut play=&leadline level=&leadLevel &leadV
&lead map=role part=lead &leadOut
&leadLevel map=amp .8
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
```

The lead player (decisions 058 and 061): a gate, `&leadOut` (Jambot's section text's name for it), whose role is `lead` (`&lead map=role &leadOut`), playing the part `&leadline` on the `lead` instrument, at its register (`&leadV loop=C4`, where Jambot's section text sounds its lead: `PIN_VOICES.lead`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&leadline`, the line (degrees over the melodic scale or the key), and `&leadLevel`, its velocities as written, a line of levels or one level.

Associated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): `&lead, &leadOut from (&leadLevel, &leadV, &style) &leadline`. `&lead from lead_performer &line` takes a copy of it, `&leadline` its main argument; `&leadLevel` an optional parameter, its line its default (`"lead_performer"(leadLevel=…)`).
Its instrument and the style it plays at are optional parameters too (decision 075, #560): `&leadV` its default `&leadV from lead(style=&style)`, the `lead` instrument, and `&style` the centre of style space. A piece passes its own (`lead_performer(leadV=&leadV, style=&style)`), where it took them by their names before; Migrate writes it.
