---
id: pentatonic
source: seed
---

```cells
&melo from (&phase) &key style=&kinderlied phase=0
&melo from (&phase) &key style=&(map=style sync=.5 harm=.775 bite=.375 mood=.75) phase=3
&melo over=&key even(5, 7, &phase)
&phase 0
```

Five of the key's seven degrees, as evenly as five go: the pentatonic taken on the key (#719). Its phase says which five, as `even(5, 12, phase)`'s does in the twelve: 0 the major pentatonic's (degrees 0 1 2 4 5: C D E G A in C major, G A B D E in G mixolydian), 3 the minor's (0 2 3 4 6: A C D E G in A minor, D F G A C in D dorian). Over a key with a major third take phase 0, over one with a minor third phase 3, as Jambot's lead does (`melodicHelix`, yggi/jambot packages/engine/src/key.ts); a key with a diminished fifth, the locrian, has neither, and keeps `plain`.
Whatever the phase and whatever the key's mode, every note is one of the key's: the pentatonic never leaves the key, so it needs no tonic of its own.

At Kinderlied's point, its phase 0, weight 1: the major pentatonic of the children's song, the scale Orff's Schulwerk teaches children to sing and play on. Its phase 3, the minor pentatonic, at the point halfway between Swing jazz and Blues shuffle (each axis their mean), where no preset is: the turnaround of [Swing blues](../../examples/jazz.md) and the tune of [Five](../../examples/five.md), which "builds on the blues", play it. Each preset keeps its own first: `plain` at Swing jazz and `blues` at Blues shuffle, at distance 0.

**Its signature** (decision 065): `&melo from (&phase) &key`. `&melo from pentatonic &key` is the major pentatonic of the key; `&melo from pentatonic(phase=3) &key` the minor. The phase is a number (decision 093): a mode word names a phase of `even(7, 12)` only, so `phase=aeolian` is an error that says so.
