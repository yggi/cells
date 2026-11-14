---
id: osc
association:
  - facet: module
source: seed
---

```cells
&osc from (&pitch)
&osc s=saw loop=C3 pitch=&pitch
&pitch 0
```

An oscillator, a modular's VCO (decision 067 §3): a voice, and its jack is its pitch.
A voice is an oscillator already (`&saw s=saw loop=C2`); this fragment gives it a panel, so that every module of a patch is written, and drawn, alike.

**Its jack**, `&pitch` (default `0`, no bend): a voice's own pitch on every note, in semitones (`pitch=`, sound.md), the input a modular's exponential FM is. Patch a slow wave into it for a drift or a vibrato: `osc(pitch=&(map=lin loop=&bar/4 0 .12 0))`, or the seed's `vibrato`.
**Its wave and its register** are its head's: a saw on C3 where the use says nothing, and the use's own attributes before `from` where it does (decision 065 §4), `&sub s=square loop=C1 from osc(pitch=&drift)`. A wave is a word, not a cell, so it is no jack.
Its notes come from the product that plays it, as any voice's do (`[&tune * &osc]`): a modular's 1 V/oct and gate are the melody's pitch and onsets ([nets.md](../../docs/notes/nets.md)).

**Its signature** (decision 065): `&osc from (&pitch)`, no main parameter. `&lead from osc` takes a copy of it, named `&lead`.

Associated as the facet `module` with no point: a module is no style's, so a query finds it at the same distance from every style (`ANY_DISTANCE`, #540). In a patch it is the VCO.
