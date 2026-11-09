---
id: lfo
association:
  - point:
      sync: 0.5
      harm: 0.5
      drive: 0.5
    weight: 0.25
    facet: module
source: seed
---

```cells
&lfo from
&lfo map=lin loop=.5 sin(12)
```

A low-frequency oscillator, a modular's LFO (decision 067 §3): a sine, ramped (`map=lin`) through its twelve points, turning once every two seconds. Read by a jack, its −1…1 is a share from 0 to 1, its middle at .5 (decision 067 §5).
An LFO is a braid turned slowly, as a voice is one turned fast (sound.md): patched into a jack, it moves what the jack moves (`lowpass(cutoff=&sweep)`, `osc(pitch=&wobble)`).

**Its rate** is its head's `loop=`, as any cell's: a use sets it before `from` (decision 065 §4), in seconds a lap or as a clock, so it keeps time with the piece: `&sweep loop=&bar/16 from lfo` comes round once every eight bars of 4/4, and `&wobble loop=&bar*2 from lfo` once a beat. Its shape is its braid; a use that wants another writes its own cell. A bipolar braid (one that runs below 0: `saw(8)`, `tri(4)`, `square(2)`) is read the same way, as (1 + x)/2; one that stays at 0 or above, as written.

**Its signature** (decision 065): `&lfo from`, the head alone. `&sweep from lfo` takes a copy of it, named `&sweep`.

Associated once, as the facet `module`, at the centre of style space, at a quarter weight; in a patch it is the LFO.
