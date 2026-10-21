---
id: bell and scale
association:
  - point:
      sync: 0.383
      harm: 0.717
      artic: 0.25
      energy: 0.417
    weight: 1
    facet: mode
  - point:
      sync: 0.8
      harm: 0.1
      artic: 0.9
      energy: 0.6
    weight: 1
    facet: rhythm
source: seed
---

```cells
&key scale(ionian, free(C)) step=1m*7
&bell step=&key:pulse &highagogo &highagogo:0:.5 &highagogo:0:.7 &highagogo:0:.5 &highagogo:0:.6 &highagogo:0:.5 &highagogo:0:.7
&agogo map=midi(10) [&bell * .5]
&highagogo s=tri loop=A5 env=&(map=adsr 0 .2 0 .05)
```

The West African standard bell pattern, x.x.xx.x.x.x, seven strokes over twelve pulses, has the major scale's intervals, 2 2 1 2 2 2 1 (the example `bell and scale`).
So one cell is both: `&key` is the major scale, the piece's main key, and stepped seven times a bar, each step as long as its interval, it is the bell's timeline, which `&bell` strikes (`step=&key:pulse`).
The repository's first fragment of two facets, a `mode`, ionian, and a `rhythm`, the bell, each at a place of its own: "the bell is a world-music associated rhythm-facet and a western music associated harmony / scale-facet" (the owner, decision 046).

A stepped key that nothing plays doesn't turn, so a line over it (`over=key`) reads the major scale as `&key scale(ionian, free(C))` does, note for note; the tonic is left to the host as the mode fragments leave it.
`step=1m*7` lays the bell over the bar of any meter, as twelve twelfths: over 12/8 they are its pulses, the bell as it is played.

Seven strokes of a high agogô (`&highagogo`, General MIDI's 67, the General MIDI kit's line word for word), the example's accents, at half the level; its card, `&agogo`, is none of the drum bars' or the claves', so it layers on any of them.
As a rhythm its point is a timeline's: off the beat (sync 0.8), over one static chord (harm 0.1), struck (artic 0.9), steady and fairly dense (energy 0.6), where no preset is.
As a mode it is where the major is played: the centroid of the three presets that play ionian, Ambient's, Bossa nova's and Swing jazz's (each axis their mean, to three decimals), where no preset is, so at each of them the plain `ionian` is found first, at distance 0.
