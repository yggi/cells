---
id: trip_hop_drums
source: seed
---

```cells
&kick, &snare, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.7 harm=.2 bite=.2) * .5
&bd, &sd, &hh from gm_kit
&kick step=16n &bd:0:.8 ~ ~ ~ ~ ~ ~ &bd:0:.5 ~ ~ &bd:0:.6 ~ ~ ~ ~ ~
&snare step=2n ~ &sd:0:.7
&hat step=8n &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35
&groove [&kick, &snare, &hat]
```

A trip-hop beat, slow and heavy: the kick on one, its echoes off the beat after it, a hard snare on three (the half-time backbeat), the hats leaning on their off-beats.
At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2), weight 0.5, as the facet `rhythm` (#542): it is first at Trip-hop's point, and reaches half as far, so the walk of `lockin.ts` still misses at the corner's far edges, where it files fragments of its own (at weight 1 no section of draws 0–31 misses there, at 0.75 none of draws 0–3, and that path loses its witness).
