---
id: highpass
source: seed
---

```cells
&highpass from (&cutoff, &res, &eg) &in
&highpass hpf=20..2400 * &eg * &cutoff hpq=1..12 * &res [&in]
&cutoff map=lin .5
&res map=lin .1
&eg map=adsr 0 0 1 0
```

A resonant high-pass filter (decision 067 §3), the low-pass's mirror: it takes away the lows of what its voices play, in series after each voice's own (decision 067 §1). A hat from white noise, a thin lead, the low end cleared from a pad.

**Its input**, the main parameter `&in`: what it filters, a voice or a mix written in place.
**Its jacks**, each a knob at its default when nothing is patched in, each a share from 0 to 1 of its range:
- `&cutoff` (default `.5`): from 20 Hz to 2400 Hz.
- `&res` (default `.1`): the resonance, from 1 to 12 (`hpq=`), nearly flat where nothing is patched.
- `&eg` (default held at 1): an envelope that moves the cutoff on every note.

**Its signature** (decision 065): `&highpass from (&cutoff, &res, &eg) &in`. A kind of filter is a word, and a parameter is a cell, so each kind is a fragment of its own (decision 067 §3), not one filter with a mode.

Associated as the facet `module` with no point: no style's (#540); in a patch, the high-pass (HPF).
