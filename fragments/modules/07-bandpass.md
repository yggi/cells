---
id: bandpass
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
&bandpass from (&cutoff, &res, &eg) &in
&bandpass bpf=100..5000 * &eg * &cutoff bpq=.5..12 * &res [&in]
&cutoff map=lin .5
&res map=lin .3
&eg map=adsr 0 0 1 0
```

A band-pass filter (decision 074): it lets a band around its centre through and takes away what is above and below it, the third of superdough's filters after the low-pass and the high-pass. An instrument, as the `lowpass` module is (decision 067), in series after each voice's own filters.

**Its input**, the main parameter `&in`: what it filters, a voice or a mix written in place, `&vcf from bandpass [&saw, &noise * .3]`.
**Its jacks**, each a share from 0 to 1 of its range, at its default when nothing is patched in:
- `&cutoff` (default `.5`): the band's centre, from 100 Hz to 5000 Hz. Patch a slow wave in for a sweep, a wah (`cutoff=&sweep`).
- `&res` (default `.3`): its Q, from .5 to 12 (`bpq=`, read linearly as Web Audio's band-pass reads it: the centre over the bandwidth). Higher is a narrower band.
- `&eg` (default held at 1): an envelope that moves the centre on every note.

**Its signature** (decision 065): `&bandpass from (&cutoff, &res, &eg) &in`, as the `lowpass` module's.

Associated once, as the facet `module`, at the centre of style space, at a quarter weight.
