---
id: haunted_pad
source: seed
---

```cells
* from style=&(map=style sync=.2 harm=.9 bite=.25 mood=.3) * .125
&padV s=tri loop=C3 env=&(map=adsr 1.5 .5 .8 2) pitch=&(map=lin loop=3 0 .1 0 -.1 0)
```

Spooky's pad: a soft triangle that swells in over a second and a half and fades over two, wavering a tenth of a semitone three times a second, so a held chord rises out of the silence and sinks back into it, the sound a ghost house opens with.
It defines `&padV`, the voice the pad performer plays, so it fills the same hole as the default `pad`, at the default's register (`loop=C3`), and sends the MIDI notes it sends.
Associated 0.05 below Spooky’s point in bite (its energy offset, #572) (Spooky: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), as `theremin` and `celesta` are: at Spooky's point itself it would tie with `organ`, which defines `&padV` there too, and take its place by id, so the organ plays at Spooky and this pad as the style grows quieter.
