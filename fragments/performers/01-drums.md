---
id: drums_performer
source: seed
---

```cells
&drums, &drumsOut from (&kit) &drumlines style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))
&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit
&kit &bd &rim &sd &cp &lt &hh &ph &mt &oh &ht &cr &rd &claves
&drumsOut play=&drumlines &kit
&drums map=role &drumsOut
```

The drummer (decisions 058 and 061, #287): a gate, `&drumsOut` (named as Jambot's section text names its gates), whose role is `drums` (`&drums map=role &drumsOut`), playing the part `&drumlines` on 13 of the General MIDI kit's voices, which it takes by name.
The part is a stack of lines, one per role, as Jambot's section text writes its drums (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b, `drumLines`): `&drumlines [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]`.
A gate plays a stack line by line, each as if it were its one line, so every hit still says which line struck it (`kit:voices:kick:…`), the drum role the feel reads (`contracts/feel` v1.1).
Each line names its own voices, and a hit its level either way, as Strudel has it: its own gain (`&bd:0:.645 ~ ~ &bd`, `s("bd:0:.645 ~ ~ bd")`), or the line times a line of levels in the stack (`&euclid * &euclidLevel`, `s("rim(7,16)").gain("…")`), read at each note's written step, so a straight Euclid under a swung meter keeps its levels, and a number (`&clave * .5`). So the drummer has no level of its own, and its one hole is the score's: `&drumlines`.
Its kit is the drummer's own set-up of those 13 voices, the kick, the side stick, the snare, the clap, three toms, the closed, pedal and open hats, the crash, the ride and the claves, a table (`&kit`): a line that strikes a voice the kit doesn't hold is an error.

Associated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays its drums the same way, on these 13 voices on channel 10, so the eight share this one drummer, and what a preset's drums sound like is its lines, not its player.

**Its signature** (decision 065): `&drums, &drumsOut from (&kit) &drumlines`. `&drums from drums_performer &groove` takes a copy of it, `&drumlines` its main argument; `&kit` an optional parameter, its line its default (`"drums_performer"(kit=…)`).
