# Style at every scale: what counts as a step, and how fast each axis moves

Date: 2026-11-07 · Status: open (the frame for #571 and #576; when #571's decision is written, this frame moves into it) · Issues: [#571](https://github.com/yggi/cells/issues/571) (style across timescales), [#576](https://github.com/yggi/cells/issues/576) (a radio station as one cells piece), in the style epic [#536](https://github.com/yggi/cells/issues/536) · Grew from decision 076 (#573, the style axes) and continues [multiscale.md](multiscale.md) (the frequency tower, the meta-machines)

The owner's frame (2026-11-07), on #571:

> it is about the intervals just as much as the absolute values. … for two sections to sound distinguishable within a piece, they have to differ in style. its the same balance between boring and confusing. it sits at all scales. pitch, rhythm, melody, harmony, progression, arrangement, curation. cultural trends are slow walkers, interpolated over millions of individual listeners.

[multiscale.md](multiscale.md)'s frequency tower puts the piece's structure on one axis of rate, from audio down to DC (Stockhausen's unified time, "…wie die Zeit vergeht…", 1957). This note continues it below the form, through sections, songs, sets and culture, and puts style on the same axis.

## What counts as a step

At every scale a unit is followed by another, and what is heard is the step between them as much as where either sits. The step is held in a band: too small is boring, too large is confusing (Berlyne's inverted U, the Wundt curve). The same law at every scale:

| scale | what counts as a step |
|---|---|
| pitch | the interval |
| rhythm | the change from bar to bar |
| harmony | the move from chord to chord |
| sections | the style delta between them: they must differ enough to be distinguishable, not so much they break the piece |
| songs in a set | the curation distance |
| generations | the distance from the parents' style: each invents not-its-parents' music (the owner's "generational contract"; Martindale's *The Clockwork Muse*, 1990, change forced by habituation) |

Jambot's homeostat already holds one such band, on recognition (yggi/jambot#237: the share of bars recognised held between 0.4 and 0.7). The frame generalises it: hold the distance between adjacent units at each scale, the band's width given by the reach (entropy, decision 076 §4) at that scale. #571 measures it first: the distance between adjacent sections on decision 076's axes.

## How fast each axis moves

Each axis of the style point, and intensity beside it, has its own spectrum: how much it swings at each rate.

| axis | where it moves most | swing |
|---|---|---|
| intensity | a section or two, the 30–60 s "fundamental" (16–32 bars at 120 bpm), and the fills of a bar above it | wide |
| `drive` (paddy ↔ stabby) | section to song | medium |
| `harm`, `bright` | song to album | small within a piece |
| `sync` | genre and band | smallest: nearly a constant of the style |
| the style point itself | culture: years to decades | the radio's slowest walker |

A sum of walkers at octave-spaced rates, each with its axis's amplitude, gives fluctuation of the 1/f kind (the Voss–McCartney construction; Voss and Clarke, 1975, reported 1/f spectra in music's loudness and pitch). Towards DC the slowest walker's amplitude grows without bound: style has no fixed mean, only slower drift. A finite system caps it, and the slowest walker this project can hold is the learned layer's, a library's favours drifting over months of play.

## Sections are filters on the style's LFOs

The owner: "sections like break and buildup are 'filters' on these 'lfos'. break a lpf, a buildup with an env opening it up." In cells' own modules (decision 067: `lfo`, `lowpass`, `amp`, `sh`, envelopes):

- Jambot's radio today is a sample-and-hold of noise, clocked by the section (`packages/engine/src/radio.ts` there);
- the walkers at several rates are sample-and-holds clocked by the section, the song and the set, summed;
- a break is a low-pass on the intensity LFO, lowered;
- a build is an envelope opening it over its 8 bars. Jambot's `barEnergy` ramp, −0.15 to +0.30 (`packages/engine/src/form.ts` there), is that envelope as constants.

So the arrangement can be a patch on the style signal, read by an instrument as `&style[drive]` is read today. #571 tries that spelling before any new form.

## Where it leads

- **A radio station as one piece** (#576): the style as `free()` sliders, the walkers patched onto them, the composer finding fragments where the style is as it moves, the arrangement as the patch above. This answers what multiscale.md's meta-machines lacked, a continuous phase space: the style point is continuous, and the repository maps it to the fragments nearest it.
- **A century** (#576's far rung, speculative): a *5 to 12* whose cycle is a hundred years, playing where the century stands at a constant offset to the present, through each era's styles. Past the present, the walkers carry on: "the sound of the future".
- **Seen in Cell studio's time view** (its scalogram and frequency tower, yggi/cell-studio#234): a radio is the first piece whose structure fills the tower's sub-Hz zone.
