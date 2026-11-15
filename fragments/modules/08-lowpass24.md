---
id: lowpass24
association:
  - facet: module
source: seed
---

```cells
&lowpass24 from (&cutoff, &res, &eg) &in
&lowpass24 lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&stage]
&stage lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&in]
&cutoff map=lin .5
&res map=lin .3
&eg map=adsr 0 0 1 0
```

A 24 dB low-pass (decision 074): two of the `lowpass` module's stages in series, each at the same cutoff and resonance, so it falls twice as steeply above its cutoff and rings harder at it. That is superdough's `24db` exactly, written out: two filters in a row are two stages (decision 067), so a steeper slope is a composition, not a new kind of filter.

**Its input**, the main parameter `&in`: what it filters, `&vcf from lowpass24 [&saw, &sub * .5]`.
**Its jacks** are the `lowpass` module's: `&cutoff` (default `.5`, 70 Hz to 4800 Hz), `&res` (default `.3`, 4 to 16, Web Audio's Q in dB, on each stage) and `&eg` (default held at 1). One cable moves both stages alike.
**`&stage`** is its first stage, its own: each use of it has its own.

**Its signature** (decision 065): `&lowpass24 from (&cutoff, &res, &eg) &in`, as the `lowpass` module's.

Associated as the facet `module` with no point: no style's (#540).
