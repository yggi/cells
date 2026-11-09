# The axes of style space, measured

Date: 2026-11-07 · Status: measured, for the owner's ruling · Issue: [#539](https://github.com/yggi/cells/issues/539), in the style epic [#536](https://github.com/yggi/cells/issues/536) · Tool: `tools/axes.ts` @ 39048157 (retired with #572)

How the four axes correlate over the presets and the library, how much of the presets' spread each principal direction carries, and what each option #539 puts to the owner does to the presets' distances and to the style each library point is nearest. A measurement; it decides no language.

## Reproduce

The tool measured the library on the axes before decision 076, so it was retired when #572 moved the library onto `sync harm drive bright`: it runs at 39048157 (the v0.21.0 release), from a checkout of that commit:

```sh
git checkout 39048157 && node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/axes.ts
```

The tables below are its output at 56a2358 (the library of styles of #537, eleven presets). `tools/axes.test.ts` @ 39048157 held the brightness rule over every scale it knew, the statistics, and that each option measured as a change against the four axes. The brightness rule #572 took weighs the third and the sixth twice (`BRIGHTNESS`, `src/engine/style.ts`); the tables below use the plain sum.

**The options.** `four`: the axes as they are. `drive`: articulation and energy as one axis, their mean. `four+bright`: a fifth axis, brightness. `drive+bright`: the slot `drive` frees, taken by brightness.

**Brightness, by rule.** A seven-note scale's degrees in semitones above its tonic, summed, less locrian's sum, over the six semitones lydian adds: locrian 0, phrygian 1/6, aeolian 2/6, dorian 3/6, mixolydian 4/6, ionian 5/6, lydian 1, and harmonic minor 3/6, level with dorian (a known limit: by ear harmonic minor is darker; a rule that weighs the third more would tell them apart). A preset's brightness is its mode's: the mode fragment the repository finds nearest its point. A library point has one by rule only where its fragment is a mode, 16 of 179, so the options with brightness are measured over those 16 alone.

**Distances** are `pointDistance`'s, the root of the mean squared difference over the axes both points have, so an option with fewer axes isn't nearer for having fewer.

### The axes' correlations over the 11 presets

| | sync | harm | artic | energy |
|---|---|---|---|---|
| sync | 1.00 | 0.18 | 0.33 | 0.45 |
| harm | 0.18 | 1.00 | -0.50 | -0.15 |
| artic | 0.33 | -0.50 | 1.00 | 0.84 |
| energy | 0.45 | -0.15 | 0.84 | 1.00 |

### Over the library's 179 association points (the centre stand-ins and the styles' own left out)

| | sync | harm | artic | energy |
|---|---|---|---|---|
| sync | 1.00 | 0.13 | 0.34 | 0.38 |
| harm | 0.13 | 1.00 | -0.45 | -0.16 |
| artic | 0.34 | -0.45 | 1.00 | 0.74 |
| energy | 0.38 | -0.16 | 0.74 | 1.00 |

### The presets' spread by principal direction

| direction | share | running |
|---|---|---|
| 1 | 50.9 % | 50.9 % |
| 2 | 36.6 % | 87.4 % |
| 3 | 11.3 % | 98.7 % |
| 4 | 1.3 % | 100.0 % |

### The presets, with drive and the brightness of the mode found at each

| style | sync | harm | artic | energy | drive | mode found | bright |
|---|---|---|---|---|---|---|---|
| Synth-pop | 0.3 | 0.45 | 0.55 | 0.55 | 0.550 | diatonic(mode=aeolian) | 0.333 |
| Techno | 0.12 | 0 | 1 | 0.8 | 0.900 | diatonic(mode=aeolian) | 0.333 |
| Deep house | 0.35 | 0.55 | 0.65 | 0.65 | 0.650 | diatonic(mode=dorian) | 0.500 |
| Ambient | 0.05 | 0.3 | 0 | 0.2 | 0.100 | diatonic(mode=ionian) | 0.833 |
| Lo-fi hip hop | 0.5 | 0.75 | 0.35 | 0.5 | 0.425 | diatonic(mode=aeolian) | 0.333 |
| Funk | 1 | 0.12 | 0.85 | 0.75 | 0.800 | diatonic(mode=dorian) | 0.500 |
| Bossa nova | 0.75 | 0.85 | 0.45 | 0.45 | 0.450 | diatonic(mode=ionian) | 0.833 |
| Swing jazz | 0.35 | 1 | 0.3 | 0.6 | 0.450 | diatonic(mode=ionian) | 0.833 |
| Electro swing | 0.55 | 0.75 | 0.6 | 0.75 | 0.675 | harmonic_minor | 0.500 |
| Spooky | 0.2 | 0.9 | 0.3 | 0.35 | 0.325 | harmonic_minor | 0.500 |
| Kinderlied | 0.1 | 0.12 | 0.5 | 0.35 | 0.425 | diatonic(mode=ionian) | 0.833 |

### The options

| option | axes | nearest two presets | their distance | median nearest gap | distances kept (r with four) | library points measured | nearest preset moves |
|---|---|---|---|---|---|---|---|
| four | sync harm artic energy | Synth-pop, Deep house | 0.090 | 0.154 | 1.000 | 179 | 0.0 % |
| drive | sync harm drive | Synth-pop, Deep house | 0.087 | 0.147 | 0.978 | 179 | 2.8 % |
| four+bright | sync harm artic energy bright | Synth-pop, Deep house | 0.110 | 0.203 | 0.972 | 16 | 12.5 % |
| drive+bright | sync harm drive bright | Synth-pop, Deep house | 0.112 | 0.187 | 0.947 | 16 | 18.8 % |

### Named pairs under each option

| pair | four | drive | four+bright | drive+bright |
|---|---|---|---|---|
| Synth-pop, Deep house | 0.090 | 0.087 | 0.110 | 0.112 |
| Spooky, Swing jazz | 0.154 | 0.127 | 0.203 | 0.200 |
| Lo-fi hip hop, Bossa nova | 0.146 | 0.156 | 0.259 | 0.284 |
| Lo-fi hip hop, Electro swing | 0.179 | 0.147 | 0.176 | 0.152 |
| Ambient, Kinderlied | 0.277 | 0.216 | 0.248 | 0.187 |

### The pairs each option moves most, against the four axes

| option | pair | four | this option |
|---|---|---|---|
| drive | Techno, Ambient | 0.603 | 0.495 |
| drive | Bossa nova, Kinderlied | 0.492 | 0.565 |
| drive | Techno, Funk | 0.451 | 0.516 |
| four+bright | Lo-fi hip hop, Bossa nova | 0.146 | 0.259 |
| four+bright | Lo-fi hip hop, Swing jazz | 0.156 | 0.264 |
| four+bright | Synth-pop, Kinderlied | 0.219 | 0.297 |
| drive+bright | Lo-fi hip hop, Bossa nova | 0.146 | 0.284 |
| drive+bright | Lo-fi hip hop, Swing jazz | 0.156 | 0.290 |
| drive+bright | Techno, Ambient | 0.603 | 0.496 |

## What the numbers say

1. **Energy and articulation carry one direction between them.** They correlate 0.84 over the presets and 0.74 over the library, and the fourth principal direction carries 1.3 % of the presets' spread: the presets use three dimensions, not four. Merging the two into `drive` keeps the presets' distances (r 0.978 with the four axes'), leaves the nearest two presets where they were (Synth-pop and Deep house, 0.090 → 0.087), and moves the nearest preset of 5 of the library's 179 points (2.8 %). It costs almost nothing, and frees a slot.
2. **The nearest two presets are Synth-pop and Deep house, at 0.090**, not Spooky and Swing jazz (0.154), as #539 and #542 said; those two are the fourth-nearest pair, after Lo-fi hip hop and Bossa nova (0.146) and Deep house and Electro swing (0.152).
3. **Brightness tells apart what the four axes crowd.** With brightness by its mode, the median gap from a preset to its nearest neighbour grows from 0.154 to 0.187 (`drive+bright`) or 0.203 (`four+bright`); Lo-fi hip hop and Bossa nova go from 0.146 to 0.284 (aeolian against ionian), and Spooky and Swing jazz from 0.154 to 0.200 (harmonic minor against ionian). The nearest two stay Synth-pop and Deep house (0.112: aeolian against dorian, one step apart).
4. **Its cost is in the library, not the presets.** 163 of the 179 points have no mode. Most of them need no brightness at all: a meter, a rhythm, a performer or a module makes no claim about it, and decision 041 already lets a point leave an axis out (a distance runs over the axes both points have). The ones that would, harmony (13), bass (14), motif (45), stab (1) and the instruments (9), could take their first value by the same rule as the presets, the mode found at their point, and be moved by hand or by use after.
5. **Of the 16 mode points, 3 change their nearest preset under `drive+bright`** (2 under `four+bright`): too few points to say more than that brightness reorders some.

## For the owner (#539's questions 1 and 4)

- **Recommended: `drive+bright`.** One axis for articulation and energy, since the presets don't use them apart, and brightness in the slot that frees, since it tells apart what the four crowd. Brightness only on tonal fragments, by rule from the mode at their point to start with. The four axes as a style's slots (`map=style`, `&style[…]`) would become `sync harm drive bright`, a change every association point and every frontend reading the axes would follow, by one migration (#539's *Done when*).
- **The other way to read (1):** keep both, because the presets are what the prototype chose, and a legato, dense style or a staccato, sparse one (#542) would use the fourth direction the presets leave empty. Then brightness is a fifth axis (`four+bright`), at the same cost in the library.
- **Entropy (question 2)** needs no measurement here: no query carries it (Jambot's `QUERY_AXES` is the four) and no fragment has it. It is the reach around the point (yggi/jambot#597 step 1).
