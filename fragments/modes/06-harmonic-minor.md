---
id: harmonic minor
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: mode
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 1
    facet: mode
source: seed
lifted: yggi/cells examples/electroswing.md @ 2c120d4
---

```cells
&key from &tonic
&key scale(harmonic, &tonic)
```

The minor with a raised seventh: the gypsy jazz key of [Electro swing, in pieces](../../examples/electroswing.md), whose vamp's fifth is then a major chord, a dominant (`[4,6,8]` over D is A C♯ E), and whose line over it is the fifth's phrygian dominant.
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic D`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole, as the other modes leave theirs.

At a point proposed for an Electro swing preset (sync .55, harm .75, artic .6, energy .75), weight 1, Jambot's to adopt (decision 041); Jambot's composer has no harmonic minor among its modes yet (`COMPOSER_MODES`, yggi/jambot packages/engine/src/key.ts).
Also at the point proposed for a Spooky preset (sync .2, harm .9, artic .3, energy .35; #349), weight 1: the key of [Spooky, in pieces](../../examples/spooky.md), its augmented second between the sixth and the seventh the sound of a horror film's minor.

**Its signature** (decision 064): `&key from &tonic`. `&key from "harmonic minor" D` takes a copy of it, `&tonic` its main argument. Taken the old way, `use &key from "harmonic minor"`, it reads `&tonic` by name, as before.
