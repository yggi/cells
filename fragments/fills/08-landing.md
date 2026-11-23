---
id: landing
source: seed
lifted: yggi/jambot packages/engine/src/ending.ts @ b98e69f
---

```cells
&kick, &backbeat, &hat, &landing from (&bd, &sd, &hh, &rd)
&bd, &sd, &hh, &rd from gm_kit
&kick role=kick step=16n &bd:0:.6 ~!7 &bd:0:.7 ~!7
&backbeat role=backbeat step=16n ~!4 &sd:0:.45 ~ &sd:0:.5 ~ &sd:0:.65 ~!7
&hat role=hat step=16n &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &rd:0:.5 ~!7
&landing [&kick, &backbeat, &hat]
```

The drums of a song's last bar, as Jambot's band ends (`finale`, yggi/jambot packages/engine/src/ending.ts @ b98e69f, #720): hats on the eighths and a backbeat leaning toward the bar's half, a snare an eighth before it, then kick, snare and ride together on the third beat, the landing, and nothing after: the chord rings on over silence. A bar of 4/4, its landing on the half bar (`slotStepOn`'s step 8 of 16); its hits are `finale`'s, step for step and drum for drum. The levels are new: Jambot's band sets a velocity by the role.

Each line is a head by its role, as a groove's are, and `&landing` their mix. It is the last layer of a drum track, placed by the form on the song's last bar, in place of the groove: `[&groove * &playing, &landing * &end]`, `&playing` 1 until the last bar and `&end` 1 on it (`snare_run` says how a level line at the bar's rate places a layer).

No style: Jambot ends the same way at every style (#720 asks for an ending found by style, the cadence and the ring included, a rung of its own), so a text takes it by its name (decision 090).

**Its signature** (decision 065): `&kick, &backbeat, &hat, &landing from (&bd, &sd, &hh, &rd)`. `&landing from landing` takes its mix.
