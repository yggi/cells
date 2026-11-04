---
id: pad
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
&padV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[artic] decay=0 sustain=1 release=.7..0.12 * &style[artic])
```

The voice Jambot's pad plays through: `&padV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp, pad and stab alike (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a pad played on it sends the MIDI notes it sends today, with no move on its gate. It is a voice of its own beside `keys`, though the two sit at one register, so a sound given to one (a pad's slow attack) isn't the other's.
Its sound is the one Jambot gives its pad and its stab alike (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle that swells in over .3 s at legato and .01 s at staccato and dies over .7 s to .12 s, as `keys` does, its envelope's slots read from the section's style at each note's start (decision 066; #391, #411); the centre's .155 s and .41 s where no line writes the style. A band that wants its pad slower than its stabs gives it its own envelope.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

Associated as `bass` is, once as the facet `instrument` at the centre of style space, at a quarter of the kit's weight; a performer asks for it by its id.
