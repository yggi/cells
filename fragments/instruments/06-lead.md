---
id: lead
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 0.25
    facet: instrument
source: seed
---

```cells
&leadV s=square loop=C4 lpf=2500 env=&(map=adsr .023 0 1 .08)
```

The voice Jambot's lead plays through: `&leadV`, whose `loop=C4` sets the register, where Jambot's section text sounds its lead (`PIN_VOICES.lead`, E35's C4: yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a lead played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's lead at the centre of style space (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a square through a low-pass at 2500 Hz, where Jambot's opens from 1400 Hz with no energy to 3600 Hz at full, with an attack of 23 ms (#391). The default band's own `&leadV` reads the style for its cutoff (`lpf=1400..3600 * &style[energy]`, the fragment `band`). Jambot's lead also moves from a soft triangle to a bright square as articulation rises, a blend of two waves in one voice, which a cells voice doesn't move: it is a square at every style.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

Associated as `bass` is, once as the facet `instrument` at the centre of style space, at a quarter of the kit's weight; a performer asks for it by its id.
