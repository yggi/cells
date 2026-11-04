---
id: lfo
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
&lfo from
&lfo map=lin loop=.5 .5 1 .5 0
```

A low-frequency oscillator, a modular's LFO (decision 067 §3): a triangle from 0 to 1, starting in the middle, ramped (`map=lin`) from point to point, turning once every two seconds.
An LFO is a braid turned slowly, as a voice is one turned fast (sound.md): patched into a jack, it moves what the jack moves (`lowpass(cutoff=&sweep)`, `osc(pitch=&wobble)`).

**Its rate** is its head's `loop=`, as any cell's: a use sets it before `from` (decision 065 §4), in seconds a lap or as a clock, so it keeps time with the piece: `&sweep loop=&bar/16 from lfo` comes round once every eight bars of 4/4, and `&wobble loop=&bar*2 from lfo` once a beat. Its shape is its braid; a use that wants another writes its own cell. A jack reads a share from 0 to 1, and a value below 0 as 0, so a bipolar wave (`sin(12)`, −1 to 1) would be silent for half its cycle: an LFO's braid stays between 0 and 1.

**Its signature** (decision 065): `&lfo from`, the head alone. `&sweep from lfo` takes a copy of it, named `&sweep`.

Associated once, as the facet `module`, at the centre of style space, at a quarter weight; in a patch it is the LFO.
