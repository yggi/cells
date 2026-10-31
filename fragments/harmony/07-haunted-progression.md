---
id: haunted progression
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.3
    weight: 0.5
    facet: harmony
source: seed
---

```cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4] [2,4,6] [3,5,7] [4,6,8] [5,7,9] [1,3,5] [4,6,8] [0,2,4]
```

Eight bars over the host's key, a chord a bar: the tonic, the third, the fourth, the fifth, the sixth, the second, the fifth again and home (i, III+, iv, V, ♭VI, ii°, V, i in a minor key).
In harmonic minor, the key Spooky's point finds, the third is an augmented triad (F A C♯ over D), the ghost-house chord that leans nowhere, and the second a diminished one (E G B♭), so the progression passes through both of the key's unstable triads before the dominant brings it home.
It is eight bars long, a section's, so Jambot's composer reads it as a progression (`packages/engine/src/harmony-query.ts`), unlike the four bars of `dark cadence`; its chords are all the key's own triads, the only kind a progression's slot holds there.
It defines `&harm` and uses the host's `&key` and main meter; it has no card, and plays only through what reads it.
Near Spooky's point (sync .2, harm .9, artic .3, energy .35; yggi/jambot#517), 0.05 lower in energy, as the facet `harmony`, at weight 0.5, so it is found within Jambot's miss distance (0.3) of Spooky alone: at weight 1 it was the nearest harmony to Synth-pop, Lo-fi hip hop, Bossa nova and Swing jazz (0.18 to 0.3), which find none of their own there and would have played it.

**Its signature** (decision 065): `&harm from &key`. `&harm from "haunted progression" &key` takes a copy of it, `&key` its main argument.
