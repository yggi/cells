---
id: spooky_stabs
source: seed
lifted: yggi/cells examples/spooky.md @ a8de625f
---

```cells
&stabline from &harm style=&spooky * .4
&stabline over=&harm step=8n ~ [0,1,2] ~ ~ ~ ~ [0,1,2] ~ ~ ~
```

The stabs of [Spooky, in pieces](../../examples/spooky.md): a chord on the second eighth of a bar of five beats and another on the seventh, so they fall off the heartbeat and never twice in the same place in the beat.
It is the part the stab performer plays (`&stabline`, decision 058): its chords are indices into the chord in force (`over=&harm`), so its holes are `&harm` and a meter of five beats, and its velocities are the performer's (`&stabLevel`).

At Spooky's point (sync .2, harm .9, bite .3, mood .3), weight 0.4, so no other preset finds it within the miss distance (Lo-fi hip hop at weight 1, #572), as the facet `stab`: Spooky's own stab, as `charleston_stabs` is Electro swing's (#572, its parts by facet).
