---
id: tonic_vamp
association:
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: harmony
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: harmony
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9
---

```cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4]!8
```

A vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for all eight bars: the vamp `[0]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).
It defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
The mode is the host key's, so one text is every mode's vamp that has these degrees: `aeolian`, `dorian`.

The layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).
From 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.

At the points where `buildTheme` plays it: aeolian at Techno's point; dorian at Funk's point. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.

**Its signature** (decision 065): `&harm from &key`. `&harm from tonic_vamp &key` takes a copy of it, `&key` its main argument.

Also at Acid's point (sync .45, harm .05, bite .85, mood .35), weight 0.4: Acid holds one chord, and at weight 1 the vamp would be Synth-pop's first harmony, 0.272 away (#572).
