---
id: styles
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 1
    facet: style
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 1
    facet: style
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 1
    facet: style
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 1
    facet: style
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 1
    facet: style
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 1
    facet: style
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 1
    facet: style
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 1
    facet: style
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 1
    facet: style
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 1
    facet: style
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 1
    facet: style
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: style
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 1
    facet: style
source: seed
---

```cells
&synthPop map=style label="Synth-pop" step=108bpm sync=.3 harm=.45 bite=.55 mood=.5
&techno map=style label="Techno" step=130bpm sync=.12 harm=0 bite=1 mood=.4
&deepHouse map=style label="Deep house" step=122bpm sync=.35 harm=.55 bite=.65 mood=.65
&ambient map=style label="Ambient" step=72bpm sync=.05 harm=.3 bite=0 mood=.9
&lofi map=style label="Lo-fi hip hop" step=84bpm sync=.5 harm=.75 bite=.35 mood=.5
&funk map=style label="Funk" step=104bpm sync=1 harm=.12 bite=.85 mood=.65
&bossaNova map=style label="Bossa nova" step=132bpm sync=.75 harm=.85 bite=.45 mood=.9
&swingJazz map=style label="Swing jazz" step=148bpm sync=.35 harm=1 bite=.3 mood=.85
&electroSwing map=style label="Electro swing" step=124bpm sync=.55 harm=.75 bite=.6 mood=.5
&spooky map=style label="Spooky" step=100bpm sync=.2 harm=.9 bite=.3 mood=.3
&kinderlied map=style label="Kinderlied" step=96bpm sync=.1 harm=.12 bite=.5 mood=.95
&acid map=style label="Acid" step=126bpm sync=.45 harm=.05 bite=.85 mood=.35
&happyHardcore map=style label="Happy hardcore" step=160bpm sync=.25 harm=.45 bite=.8 mood=.9
&elektro map=style label="Elektro" step=112bpm sync=.15 harm=.5 bite=.85 mood=.45
&darkAmbient map=style label="Dark ambient" step=76bpm sync=.35 harm=.15 bite=.4 mood=.1
&baroque map=style label="Baroque" step=90bpm sync=.15 harm=.8 bite=.5 mood=.85
&bluesShuffle map=style label="Blues shuffle" step=120bpm sync=.65 harm=.55 bite=.45 mood=.65
&seaShanty map=style label="Sea shanty" step=112bpm sync=.1 harm=.25 bite=.7 mood=.65
&chiptune map=style label="Chiptune" step=144bpm sync=.3 harm=.7 bite=1 mood=.55
&salsa map=style label="Salsa" step=180bpm sync=.9 harm=.5 bite=.7 mood=.75
&waltz map=style label="Waltz" step=150bpm sync=0 harm=.7 bite=.3 mood=.9
&march map=style label="March" step=120bpm sync=0 harm=.1 bite=.75 mood=.7
&tripHop map=style label="Trip-hop" step=80bpm sync=.7 harm=.2 bite=.2 mood=.25
```

The library of styles (decision 063 §3, #391, #537): the twenty-three preset styles, each a `map=style` cell at its point, its axes by name (cells' table of axes, `AXES`), its display name its `label=` and its default tempo its `step=`. They are Jambot's eight from the prototype, then Electro swing and Spooky (#349), then Kinderlied (yggi/jambot#547), whose 96 bpm is Twinkle's, then four read from the examples (#572, #542): Acid, from *Acid-Cell* (its 303, its riff and its beat), Happy hardcore, from *Hypercell*, and Elektro, from *Zelluläre Aktivität*. Their moods are placed by hand: Acid's minor hypnotic and tense (.35), Happy hardcore's euphoric though it turns on A minor (.9: the mood goes beyond the mode), Elektro's cool (.45). Dark ambient, from *Ghost-Cells*, is the bottom of the mood axis (.1): a minor drone made menacing. Then four more cut from the examples (#542): Baroque, from the Bach pieces, Blues shuffle, from *Swing blues*, Sea shanty, from *Drunken Sailor*, and Chiptune, from *Korobeiniki*; and four placed by hand, with parts written for them (#542): Salsa (the clave's off-beats, the tumbao, mixolydian), Waltz (where 3/4 and the `waltz` motif already sat), March (2/4, stamping and bright) and Trip-hop (.7 .2 .2 .25, the offbeat, static, paddy and dark corner no style held).

This file is the presets' one source: `STYLES` (`src/repository/styles.ts`) reads each as `{ id, name, point, tempo }`, in this order, and a frontend takes its presets from there. Only the library reads the `step=`: `style=` and a query read the point, so a style has no tempo (decision 037, D6).

A score names its section's style by one of them where the section sits exactly on it, and by its numbers or a mix of them where it doesn't:

```text
&funk from styles
&style label="Funk" style=&funk
```

The default band reads the style through `&style` (`band`: its bass's and its lead's cutoff), and so does its choice of instruments (`resolveBand`): Spooky's, named, plays the round bass, the organ, the celesta and the theremin, as its numbers do.

The points were lifted from yggi/jambot `packages/engine/src/style.ts` @ 7b078e8, with their tempos @ dcc414d. Associated once at each of them, as the facet `style`, at weight 1: the style nearest a point is a query (`{ facet: 'style' }`), and a test holds the association to the cells' points.
