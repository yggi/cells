---
id: ghost_drums
association:
  - point:
      sync: 0.1
      harm: 0.9
      bite: 0.3
    weight: 1
    facet: rhythm
source: seed
---

```cells
&kick step=1m &bd:0:.45
&hat step=4n &rd:0:.08
&euclid step=1m [~ &rim]
&groove [&kick, &hat, &euclid * .2]
```

Almost no drums, as a ghost house has: one soft heartbeat at the head of the bar, a clock ticking each beat at the edge of hearing, and a knock at the middle of the bar.
It is `spooky_drums` thinned for a quieter, stiller point: the heart beats once a bar, not every beat, so the bar is mostly air.
Every line fits any meter and lands on its sixteenths, as `spooky_drums`' do: the kick and the rim on the bar and its half, the ride on the beat.
Its lines are named by Jambot's drum roles (`kick`, `hat`, `euclid`) and strike only voices its kit holds (`&bd` 36, `&rd` 51, `&rim` 37); they carry no card (#291): `&groove` is the mix.
Near Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.1 lower in sync, weight 1, as the facet `rhythm`.
