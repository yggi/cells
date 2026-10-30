---
id: diesIrae
association:
  - point:
      sync: 0.2
      harm: 0.9
      artic: 0.3
      energy: 0.35
    weight: 1
    facet: motif
source: seed
---

```cells
&diesIrae from &key
&diesIrae over=&key step=8n 2 1 2 0 1 -1 0@2
```

The head of the *Dies irae*, the plainchant of the day of wrath, which Berlioz, Liszt, Saint-Saëns and a century of horror films quote: the third, the second, the third, the tonic, the second, the note below the tonic, and the tonic held (F E F D E C D in D minor; C♯ in harmonic minor, which makes it darker still). The chant is in the public domain.
It is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).
Its head is named for it (`&diesIrae`), so `use &diesIrae` takes it; a form reads it as its `&call` (`&call step=8n &diesIrae`), the line the form moves and answers.
At the point proposed for a Spooky preset (sync .2, harm .9, artic .3, energy .35; #349), weight 1, Jambot's to adopt (decision 041).

**Its signature** (decision 065): `&diesIrae from &key`. `&diesIrae from diesIrae &key` takes a copy of it, `&key` its main argument. Taken the old way, `use &diesIrae from diesIrae`, it reads `&key` by name, as before.
