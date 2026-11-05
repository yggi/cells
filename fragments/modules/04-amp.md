---
id: amp
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 0.25
    facet: module
source: seed
---

```cells
&amp from (&eg, &level) &in
&amp [&eg * &level * &in]
&eg map=adsr .005 .2 .7 .1
&level map=amp 1
```

An amplifier, a modular's VCA (decision 067 §3): an instrument with an envelope and a level, the volumes that act on what it plays acting on each of its voices (mix.md: a pitch or a volume on a mix acts on each voice).
It is what an instrument with an envelope always was, `[&(map=adsr …) * &saw]`, with jacks.

**Its input**, the main parameter `&in`: what it shapes, a voice, a filter, a mix.
**Its jacks**:
- `&eg` (default a struck and held shape: 5 ms up, a fall over .2 s to .7, a release of .1 s): the envelope on every note. An inline one is a cell of its own, `amp(eg=&(map=adsr .002 .3 .5 .06))`, its slots changed where it says; or one of the seed's `envelopes`, `amp(eg=&pluck)`.
- `&level` (default `1`): a level over time, a volume (`map=amp`, `map=lin`, `map=db`): accents, a swell, a tremolo from a fast LFO.

**Its signature** (decision 065): `&amp from (&eg, &level) &in`.

Associated once, as the facet `module`, at the centre of style space, at a quarter weight; in a patch it is the VCA.
