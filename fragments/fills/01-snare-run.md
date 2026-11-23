---
id: snare_run
source: seed
---

```cells
&fill from (&sd)
&sd from gm_kit
&fill role=fill step=16n ~!12 &sd:0:.3 &sd:0:.37 &sd:0:.44 &sd:0:.5
```

Jambot's own fill: the snare in sixteenths from three quarters through a 4/4 bar to its end, rising (`drums.ts`: from `lateOf(steps)`, 12 of 16; yggi/jambot packages/engine/src @ b98e69f), the run its drummer plays at a section's end at a chance of 0.35 + 0.3 × sync (#718). The levels are new: Jambot's band sets a fill's velocity by its role.

One bar, its line `&fill` (role `fill`); a piece places it on a section's last bar by a level line at the bar's rate: `[&groove, &fill * &fillAt]` with `&fillAt map=amp step=1m cycle=8 0!7 1`, the last of every eight. A drum track is layers, each a line by its role, and a fill is one more, placed by the form as a groove places its euclid's hits by `&euclidLevel` one level down.

No style: Jambot plays it at every style, so no query finds it, and a text takes it by its name (decision 090); the fills of the facet are each style's own.

**Its signature** (decision 065): `&fill from (&sd)`. `&fill from snare_run` takes a copy; `snare_run(sd=&mine)` runs another drum.
