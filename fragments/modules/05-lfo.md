---
id: lfo
source: seed
---

```cells
&lfo from
&lfo map=lin loop=.5 sin(12, 0..1)
```

A low-frequency oscillator, a modular's LFO (decision 067 §3): a sine, ramped (`map=lin`) through its twelve points, turning once every two seconds, laid within 0 to 1 (`sin(12, 0..1)`, Strudel's `sine.range(0, 1)`): a share a jack reads, its middle at .5.
An LFO is a braid turned slowly, as a voice is one turned fast (sound.md): patched into a jack, it moves what the jack moves (`lowpass(cutoff=&sweep)`, `osc(pitch=&wobble)`).

**Its rate** is its head's `loop=`, as any cell's: a use sets it before `from` (decision 065 §4), in seconds a lap or as a clock, so it keeps time with the piece: `&sweep loop=&bar/16 from lfo` comes round once every eight bars of 4/4, and `&wobble loop=&bar*2 from lfo` once a beat. Its shape is its braid; a use that wants another writes its own cell. A wave that runs below 0 (`saw(8)`, `tri(4)`) is cut off at 0 where a jack reads it, as any value is: lay it within a range, `saw(8, 0..1)`.

**Its signature** (decision 065): `&lfo from`, the head alone. `&sweep from lfo` takes a copy of it, named `&sweep`.

Associated as the facet `module` with no point: no style's (#540); in a patch it is the LFO.
