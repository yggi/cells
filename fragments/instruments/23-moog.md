---
id: moog
source: seed
lifted: yggi/cells examples/prelude.md @ a8de625f
---

```cells
* from style=&baroque * .125
&leadV s=saw loop=C4 lpf=1600 lpq=7 env=&(map=adsr .002 .3 .4 .25)
```

The synthesizer of [Bach, Prelude in C: for Wendy](../../examples/prelude.md): a sawtooth through a resonant low-pass (`lpq=7`), struck and half held, the sound of Bach played on an old modular synthesizer. The example doubles it with a square an octave down; one is what a voice is.
It defines `&leadV`, the voice the lead performer plays, at the default lead's register.

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85) as the facet `instrument`, at half the default instruments' weight (0.125) (#350, #542).
