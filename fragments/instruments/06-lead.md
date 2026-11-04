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
&leadV s=tri..square * &style[artic] loop=C4 lpf=1400..3600 * &style[energy] env=&(map=adsr attack=.04..0.006 * &style[artic] decay=0 sustain=1 release=.08)
```

The voice Jambot's lead plays through: `&leadV`, whose `loop=C4` sets the register, where Jambot's section text sounds its lead (`PIN_VOICES.lead`, E35's C4: yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a lead played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's lead (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a soft triangle at legato blending to a bright square at staccato (`s=tri..square * &style[artic]`, decision 066), through a low-pass that opens with the section's energy, from 1400 Hz to 3600 Hz (`lpf=1400..3600 * &style[energy]`), its attack sharpening from 40 ms to 6 ms as articulation rises (#391, #411). Jambot weights its triangle 1.8 against the square; the blend holds each wave at its own peak.
It reads the section's style, `&style`, the composer's: the score writes it, and the instrument defines none (decision 063 §3); where no line writes it, it reads the centre of style space (a blend halfway, 2500 Hz, 23 ms), and an info says so in a piece with performers.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

Associated as `bass` is, once as the facet `instrument` at the centre of style space, at a quarter of the kit's weight; a performer asks for it by its id.
