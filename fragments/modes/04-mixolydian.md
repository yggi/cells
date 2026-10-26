---
id: mixolydian
association:
  - point:
      sync: 0.875
      harm: 0.485
      artic: 0.65
      energy: 0.6
    weight: 1
    facet: mode
source: seed
---

```cells
&key scale(mixolydian, &tonic)
```

The major with a minor seventh: the fourth of the composer's modes (`COMPOSER_MODES`, yggi/jambot packages/engine/src/key.ts), which no preset plays.
It defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic D`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).
The tonic is left to the text that uses it, a hole: there is no default, since a default tonic plays a wrong key silently (#117); the performer's room, `free(…)`, is the tonic cell's to give (`&tonic free(…)`, not yet a form).

Between the major and the dorian minor (it shares the major's third and the dorian's seventh), it sits halfway between Funk's point (dorian) and Bossa nova's (ionian), where the son clave 3-2 sits too: the funk and rock of a major key with a flat seventh. It is the nearest mode there only, since each preset's own mode is at distance 0 at its point.
