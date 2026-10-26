---
id: Electro swing drums
association:
  - point:
      sync: 0.55
      harm: 0.75
      artic: 0.6
      energy: 0.75
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/electroswing.md @ 2c120d4
---

```cells
&kick step=4n &bd!4
&clap step=4n ~ &cp:0:.6 ~ &cp:0:.6
&hats step=8n ~ &oh:0:.4 ~ &oh:0:.4 ~ &oh:0:.4 ~ &oh:0:.4
&ticks step=16n &hh:0:.2 &hh:0:.2? &hh:0:.2 &hh:0:.2?.7 &hh:0:.2 &hh:0:.2? &hh:0:.2 [&hh:0:.2,&sd:0:.03]
&groove [&kick, &clap, &hats, &ticks]
```

The electro swing beat of [Electro swing, in pieces](../../examples/electroswing.md): house's four on the floor and its clap on two and four, under a jazz record's swung eighths, the open hat on every off-beat and a sixteenth hat with some strokes left to chance (`?`, keyed on the seed: decision 031) and a ghost of the snare on the last.
It holds no `&bar`, so the host's meter swings it: under `4/4 swung on 8n` (or the example's lighter `swing=8n:.64`) the open hats fall late, the kick and the clap stay on the beat.
Its lines strike the kit's names (`&bd` `&cp` `&oh` `&hh` `&sd`), holes the core kit fills, and carry no card (#291): `&groove` is the mix, its levels in the hits.
A piece arranging it takes its limbs by name (`use &kick, &clap, &hats, &ticks from "Electro swing drums"`), as the example does, each under a level of its own.

At the point proposed for an Electro swing preset (sync .55, harm .75, artic .6, energy .75: `ELECTRO_SWING`, `src/repository/presets.ts`), which Jambot has no preset at yet; weight 1.
