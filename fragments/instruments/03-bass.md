---
id: bass
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
&bassV s=saw loop=C2 lpf=450..900 * &style[artic] lpq=4 env=&(map=adsr .005 .2 .7 .05)
```

The voice the bass lines play through (decision 054, rung 7's first; #244): `&bassV`, whose `loop=C2` sets the register, so the lines' MIDI notes on Jambot's bass channel are the notes they were when each line carried its own `&bassV loop=C2`.
Its sound is Jambot's bass (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74, and the synth that plays it, `apps/web/src/audio/voices.ts`): a saw through a resonant low-pass (`lpq=4`) that opens with the section's articulation, from 450 Hz at legato to 900 Hz at staccato (`lpf=450..900 * &style[artic]`), struck with a short attack and held (#391).
It reads the section's style, `&style`, the composer's: the score writes it, and the instrument defines none (decision 063 §3). Where no line writes it, as when the bass is heard alone, it reads the centre of style space, 675 Hz, and an info says so.
It sounds within the renderer's first stage (decision 062, R1): a wave, a filter and an envelope. A sound changes no note it sends: MIDI out sends the notes it sent with no sound, and a MIDI card alone says the sound isn't sent (decision 064).
It defines the one voice the five bass lines read and uses nothing, so it fills their hole on any workbench; the lines no longer carry a voice of their own.

Associated as the kit is, once as the facet `instrument` at the centre of style space, at a quarter of its weight, so a query for an instrument finds the kit first; the composer asks for the bass by its id.
