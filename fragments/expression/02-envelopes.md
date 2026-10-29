---
id: envelopes
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 0.25
    facet: expression
source: seed
---

```cells
&click map=adsr 0 .03 0 .02
&tap map=adsr 0 .08 0 .04
&snap map=adsr 0 .12 0 .05
&thump map=adsr 0 .3 0 .05
&strike map=adsr .005 .15 .5 .05
&pluck map=adsr .005 .25 .5 .1
&swell map=adsr .02 .3 .5 .3
```

The shapes a note's level takes, by name (#196): a voice's `env=` (`&hh s=white hpf=8000 env=&click`), each attack, decay, sustain and release in seconds and a level, as `map=adsr` reads them.
They are the seven the examples wrote out most, each from its most common spelling:
- **Struck, nothing held:** `&click` (a hat, a rim, a tick, 30 ms), `&tap` (80 ms), `&snap` (a snare, 120 ms), `&thump` (a kick, 300 ms).
- **Held:** `&strike` (a stab, struck and held at half), `&pluck` (a plucked string, a quarter second to half), `&swell` (a pad: a soft attack, a long release).

An envelope near one of them, each value within a fifth of it, became it in the examples (the owner, #196: "collapse … minimal differences … as long as the 'spirit and style of the piece' is preserved"); one that is a piece's own, slower, longer or shaped otherwise, stays as the piece writes it.
The names are no performer's (`&stab`, `&pad`, `&lead`, `&keys` are role cells, decision 061), so a piece that plays those parts takes these too.

It defines cells and uses nothing, so it fits any workbench. Associated once, as the facet `expression`, as `vibrato` is: at the centre of style space, at a quarter weight.
