---
id: dark cadence
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 1
    facet: harmony
source: seed
---

```cells
&harm from &key
&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]
```

Four bars over the host's key, a chord a bar: the tonic, the sixth, the fourth, the fifth (i, ♭VI, iv, V in a minor key), then round again, the fifth pulling back to the tonic.
In harmonic minor, the key the point finds, the fifth is major (A C♯ E over D), a dominant, and the sixth (B♭ D F) sits a semitone above the fifth's root, so the bass falls B♭, G, A and the chords lean in by semitones.
It defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
Its lap is four bars, not the vamps' eight: Jambot's composer reads only progressions of eight (yggi/jambot `packages/engine/src/harmony-query.ts`), so it doesn't take this one yet, and where no harmony is near one of its presets (Synth-pop, Deep house, Lo-fi hip hop, Bossa nova, Swing jazz) it generates its harmony as before, though this is the nearest there.
Written by hand for the point proposed for a Spooky preset (sync .2, harm .9, artic .3, energy .35; #349), weight 1, Jambot's to adopt (decision 041).

**Its signature** (decision 065): `&harm from &key`. `&harm from "dark cadence" &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &harm from "dark cadence"`, it reads `&key` by name, as before.
