# 043 · The composer asks the repository first and judges what it gets, generating what doesn't satisfy it; a place by association, queries in order that fit, and one ladder of novelty

**Date:** 2026-10-17 · **Status:** accepted (owner, in the session of 2026-10-17: the concept below, quoted on yggi/jambot#358; "put this as the central roadmap epics") · Issues: #81, yggi/jambot#358, #49

## Context

The eternal jam's brief (yggi/jambot `docs/briefs/eternal-jam.md`) had the composer generate the band's music from the style vector, and a repository of fragments added later.
The owner's concept turns this round:

> composer-workbench is empty, composer queries repository for all parts it needs (meter, rhythms, section progression, harmonic progression, drum patterns, instrument-profiles (resp. synth-patches), ... from queries to the repository, each giving something that matches the style-vector used for the query, including more or less generous free()
> then the feedback loop takes over: the conductor gives the score to the performers, the muse listens to their output, it returns to the Composers workbench (= fading short-term memory) and is reused. permutated by the composer, improvised upon within their free()doms by the players, noted down by the muse. when something tends to become boring, the composer reaches for the repository, when the composition leans towards confusing, variation is reduced.

The first rungs are built.
- **Taps (040)** let a part fit any meter.
- **Swing on the bar and `legato=` by level** let a meter carry its feel.
- **The repository (041)** finds meters by style, and each of Jambot's presets finds the meter that plays its swing exactly (#102).

## Decision

1. **The composer asks the repository first, judges what it gets, and generates what doesn't satisfy it.**
   It fills an empty workbench by asking the repository for each part.
   It judges every result against the composition on its workbench, and may reject it.
   When nothing satisfies it, it generates a fragment of its own that fits the composition, files it in the repository under the style it was made for, and uses it.
   The composer stays a generator: the repository is where it looks first, not a replacement for it (owner, 2026-10-17).
2. **A fragment's place in style space is an association, not a reading** (041).
   It comes from where the fragment was found, where it was made, and where jams kept it.
   A reading of the fragment itself is only a first guess: a meter, a clave or a section pattern has nothing to read on most axes.
   Use moves the association; the repository learns.
3. **Queries come in order, and each must fit the workbench.**
   The meter comes first, since the host owns the clock, then the rhythms that fit it, the harmony, the lines and the instruments.
   A part that taps (`step=16n`) fits any meter; a two-bar clave (`step=16n cycle=2`) fits only a meter that holds it.
4. **Fragments come in groups.**
   A patch and the bassline it was made for go together, so how often fragments were used together ranks beside the style point.
5. **One ladder of novelty, moved by the entropy axis:** repeat, vary with operators, recombine the workbench, fetch from the repository nearby, fetch far.
   Bored climbs it; confused steps down it and narrows `free()`.
   Radio mode is this ladder with nobody playing.
6. **A feel is one fragment.**
   A meter carries its swing (`swing=8n:2/3`) and its articulation by level (`legato=16n:.5`); its accents join it later (#21).
   So whether the band swings, or plays tight sixteenths, is a question of which meter fragment it plays, not an axis of the style.

Nothing jumps: a fetched fragment enters at a section boundary, or fades in by density.

**Why not** the generators alone: genres would stay patches in code, against "as little hardwired as possible", and nothing a jam made would outlive it.
**Why not** the repository alone: a fragment found by style alone may not fit the composition it joins; the composer's judgement decides, and what it makes instead goes back to the repository.
**Why not** a reading as a fragment's place: most parts have nothing to read on most axes; the swung meters showed it (swing left the style vector, yggi/jambot#360).

## Open

- Whether learning by use locks onto a few fragments; the entropy walk is the counterweight. To be measured, not assumed.
- Whether four axes are enough once swing is a fragment. A first measurement: without swing, a bar reads as its own preset in 53 % of bars, against 64 % with it (yggi/jambot#369, E24). Under this decision, what sits in each region tells genres apart, more than the axes do.

## Consequences

- The central roadmap epics, #81 and yggi/jambot#358, hold the path and where it stands.
- #49's steps (the hash, the canonical form, a phrase as cells) serve this; Jambot's composer asking the repository for its meter at a section's start is the first use.
- Jambot's brief says the same: the composer selects, generation is the miss.
