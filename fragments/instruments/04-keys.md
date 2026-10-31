---
id: keys
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
&keysV s=tri loop=C3 env=&(map=adsr .155 0 1 .41)
```

The voice Jambot's comp plays its stabs through, and any keyboard part: `&keysV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a stab played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's chords at the centre of style space (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle that swells in over .155 s and dies over .41 s, where Jambot's attack shortens from .3 s at legato to .01 s at staccato and its release from .7 s to .12 s (#391). An envelope's times are numbers, not a moving parameter, so it plays this one at every style until they can move (#411); a text that wants the staccato end writes its own `&keysV`.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

Associated as `bass` is, once as the facet `instrument` at the centre of style space, at a quarter of the kit's weight; a performer asks for it by its id.
