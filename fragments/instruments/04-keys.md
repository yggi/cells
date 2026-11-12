---
id: keys
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
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 0.25
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 0.25
    facet: instrument
source: seed
---

```cells
&keysV from (&style)
&keysV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[bite] decay=0 sustain=1 release=.7..0.12 * &style[bite])
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
```

The voice Jambot's comp plays its stabs through, and any keyboard part: `&keysV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a stab played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's chords (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle whose attack shortens from .3 s where the style is paddy to .01 s where it is stabby and its release from .7 s to .12 s, its envelope's slots read from the section's style at each note's start (`attack=.3..0.01 * &style[bite]`, decision 066; #391, #411). Where no line writes the style, the centre's: .155 s and .41 s.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).

It declares the style it reads, as `bass` does: `(&style)`, its default the centre (decision 075, #560).

Associated as `bass` is, as the facet `instrument` at a quarter of the kit's weight; a performer asks for it by its id.

**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Swing jazz and Funk, where keys comp; weight 0.25.
