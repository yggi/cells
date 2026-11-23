---
id: blues
source: seed
---

```cells
&melo from &tonic style=&bluesShuffle
&melo scale(blues, &tonic)
```

The blues scale on the key's tonic, 3 2 1 1 3 2 up the twelve (C E♭ F F♯ G B♭ on C): the minor pentatonic with the flat fifth between its fourth and fifth. The scale of the riff of [Swing blues](../../examples/jazz.md), which plays it over a dominant blues in C.

**It leaves the key** (#719): its flat fifth is in no diatonic mode but the lydian, where it is the raised fourth, and over a key with a major third (Blues shuffle's mixolydian, `diatonic`) its flat third isn't either. So it isn't written over the key's degrees, as `plain` and `pentatonic` are, but as a necklace of its own on the key's tonic: it reads `&tonic`, the cell the key's own fragment reads (`diatonic`), not `&key`. A line over `&melo` is then in the blues, whatever the key's mode; the harmonies go on reading the key.

At Blues shuffle's point, weight 1, as the facet `melodic`, where Swing blues' riff was cut from (`styles`). Over a key with a major third Jambot's lead walks the major blues instead (`major_blues`), as its own table says; the blues over a dominant is the idiom of Swing blues, and Blues shuffle is no preset of Jambot's prototype, so Jambot's lead plays the key's own scale there today unless its players wish for this one.

**Its signature** (decision 065): `&melo from &tonic`. `&melo from blues &tonic` takes a copy of it, `&tonic` its main argument.
