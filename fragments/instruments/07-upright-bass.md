---
id: upright_bass
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.55
      mood: 0.9
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

```cells
&bassV s=saw loop=C2 lpf=700 env=&(map=adsr .005 .3 .25 .08)
```

Electro swing's bass, plucked and dark: a saw closed down to 700 Hz with a short decay and a low sustain, so each note thumps and fades as a slapped string does.
It defines `&bassV`, the voice the bass performer plays (`&bassV from bass`), so it fills the same hole as the default `bass` and can stand in for it.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s `&bassV` but for its register: `loop=C2`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on `bass` (the example's `loop=C3` is the piece's own).
It sounds within the renderer's first stage (decision 062, R1): a wave, a low-pass filter and an envelope.

Associated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Swing jazz's and Blues shuffle's points, whose bass is an upright, and near Bossa nova's (0.1 off), a second choice behind its own.
