---
id: build_run
source: seed
---

```cells
&fill from (&sd)
&sd from gm_kit
&fill role=fill step=16n ~!8 &sd:0:.25 &sd:0:.28 &sd:0:.31 &sd:0:.34 &sd:0:.38 &sd:0:.42 &sd:0:.46 &sd:0:.5
```

The build's fill: the snare in sixteenths from the half bar to the end of a 4/4 bar, rising, as Jambot's drummer ends a build (`drums.ts`: from `halfOf(steps)` in a build's last bar; yggi/jambot packages/engine/src @ b98e69f, #718). Twice the length of `snare_run`, the run a build's lift needs.

One bar, its line `&fill` (role `fill`), placed by the form on a build's last bar (`snare_run` says how). No style: a section kind, not a style, asks for it (a build), so a text takes it by its name (decision 090).

**Its signature** (decision 065): `&fill from (&sd)`. `&fill from build_run` takes a copy.
