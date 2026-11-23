---
id: major_blues
source: seed
---

```cells
&melo from &tonic
&melo scale(scan(2 1 1 3 2 3), &tonic)
```

The major blues on the key's tonic, 2 1 1 3 2 3 up the twelve (C D E♭ E G A on C): the major pentatonic with the flat third between its second and third. It is the blues' necklace (`blues`, 3 2 1 1 3 2) from its second note, the relative minor's blues heard from the major's tonic.
The blues Jambot's lead walks over a key with a major third (`MELODIC_DEGREES`' major side, yggi/jambot packages/engine/src/key.ts @ b98e69f); like `blues` it leaves the key, so it is a necklace of its own on the tonic and reads `&tonic`.

No style: no query finds it, and a text takes it by its name (decision 090), as a player's wish for the blues over a major key does.

**Its signature** (decision 065): `&melo from &tonic`. `&melo from major_blues &tonic` takes a copy of it, `&tonic` its main argument.
