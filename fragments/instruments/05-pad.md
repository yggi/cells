---
id: pad
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 0.25
    facet: instrument
source: seed
---

```cells
&padV from (&style)
&padV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[bite] decay=0 sustain=1 release=.7..0.12 * &style[bite])
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
```

The voice Jambot's pad plays through: `&padV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp, pad and stab alike (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a pad played on it sends the MIDI notes it sends today, with no move on its gate. It is a voice of its own beside `keys`, though the two sit at one register, so a sound given to one (a pad's slow attack) isn't the other's.
Its sound is the one Jambot gives its pad and its stab alike (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle that swells in over .3 s where the style is paddy and .01 s where it is stabby and dies over .7 s to .12 s, as `keys` does, its envelope's slots read from the section's style at each note's start (decision 066; #391, #411); the centre's .155 s and .41 s where no line writes the style. A band that wants its pad slower than its stabs gives it its own envelope.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

It declares the style it reads, as `bass` does: `(&style)`, its default the centre (decision 075, #560).

Associated as `bass` is, as the facet `instrument` at a quarter of the kit's weight; a performer asks for it by its id.

**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno and Ambient, a pad's styles; weight 0.25.
