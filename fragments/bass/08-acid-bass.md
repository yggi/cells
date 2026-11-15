---
id: acid_bass
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

```cells
&bassline from &harm style=&acid
&bassline over=&harm step=16n 0 0 &r^$12 0 ~ 0 &r^$7 0 &r^$10 ~ 0 &r^$12 0 &r^$3 &r^$5 &r^$7
&r over=&harm 0
```

The riff of [Acid-Cell](../../examples/acid.md), its first bar of sixteenths: the root, its octave, the fifth, the minor seventh, the minor third and the fourth, with two rests that let the filter breathe.
The example writes it in A minor's degrees; here it is in semitones above the chord's root (`&r^$12` an octave up), so it plays over whatever chord the harmony holds, as a minor riff.
It is the part the bass performer plays (`&bassline`, decision 058); its holes are `&harm` and a meter.

At Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet `bass` (#572).
