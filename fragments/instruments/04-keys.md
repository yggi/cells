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
&keysV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[artic] decay=0 sustain=1 release=.7..0.12 * &style[artic])
```

The voice Jambot's comp plays its stabs through, and any keyboard part: `&keysV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a stab played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's chords (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle whose attack shortens from .3 s at legato to .01 s at staccato and its release from .7 s to .12 s, its envelope's slots read from the section's style at each note's start (`attack=.3..0.01 * &style[artic]`, decision 066; #391, #411). Where no line writes the style, the centre's: .155 s and .41 s.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

Associated as `bass` is, once as the facet `instrument` at the centre of style space, at a quarter of the kit's weight; a performer asks for it by its id.
