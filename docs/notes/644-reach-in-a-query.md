# A reach in a query: what reading it would change, and the alternatives

Date: 2026-11-09 · Status: measured; ruled as recommended (the owner, 2026-11-09: "644 as suggested") · Issues: [#644](https://github.com/yggi/cells/issues/644) (the question), [#436](https://github.com/yggi/cells/issues/436) (the reach, written in the text), [#371](https://github.com/yggi/cells/issues/371) (the forms' points), yggi/jambot#547 rung 4, in the style epic [#536](https://github.com/yggi/cells/issues/536) · Tool: `tools/coverage.ts`

#436 brings a reach per axis onto an association point, in decision 079's spelling (`bite=.55 ± .1`). #644 asks whether a query should read it. This note measures what reading it would change, on the case that asks first: the forms, placed by idiom (the owner, 2026-11-09: "form follows idiom. same for sections"). A measurement; it decides no language.

## Reproduce

Measured on #624's head (834341c, the axes `sync harm bite mood`) and again on `main` once it landed (c41ef2e), with the same numbers, with the placements committed beside this note:

```sh
npm run coverage -- --facet form --k 3 --place docs/notes/644-forms-full.json --distance today
npm run coverage -- --facet form --k 3 --place docs/notes/644-forms-reach.json --distance hinge
npm run coverage -- --between --facet form --k 2 --place docs/notes/644-forms-reach.json --distance window --json
```

The counts below are over 120 places: the 15 styles of `styles` and the 105 points halfway between two of them (`--between`), where Jambot's radio drifts. They rank as a query with nothing chosen and no layer does; the tool's test holds `today` to the query itself.

## How a query measures today

- A point's distance from a style is the root of the mean squared difference **over the axes both name** (`pointDistance`): an axis a point leaves out is dropped from the mean.
- A fragment's distance is its nearest point's, divided by that point's weight.
- A tie is broken by id. The four centre forms tie everywhere, so AABA is found first everywhere (#371).
- Co-use pulls a fragment used with what is already chosen by at most 0.01 (`CO_USE_PULL` 0.1 × `CO_USE_REACH` 0.1). Where the first two are within 0.01, use can swap them.
- Jambot treats a first fragment past 0.3 as a miss (`MISS_DISTANCE`), and its own generator plays instead.

**Every facet's points name the same axes** on #624's head:
- `meter`, `rhythm`, `performer`, `form`, `module`, `expression` and `band` name `sync harm bite`;
- the rest name all four.

So within a facet, no point is measured over fewer axes than another today.

## The options

| | what a reach does | a missing axis | no reach written |
|---|---|---|---|
| **A. not read** (today) | nothing in a query; only Cell studio's map reads it | dropped | as today |
| **B. window** (#644 as filed) | 0 inside it; outside, measured from its edge | dropped | as today |
| **C. hinge** | a quarter of the slope inside it (`HINGE`); the whole slope from its edge | dropped | as today |
| **D. whole** (#436's comment: "a missing axis is a reach of the whole axis") | as B | 0, but counted in the mean | **distances move**: a three-axis facet's shrink by √¾ |

Two more, outside the point:
- **E. the query's reach:** decision 076 makes entropy the reach of the section's style. A query could measure from its own window, not from a point. That is a reach on the other side, and needs no spelling in a fragment.
- **F. several points:** a fragment that fits a range writes a point at each end, as the tonic vamp does at several presets. It needs no new rule, but writes more.

## The forms by idiom, measured

Two placements of the four forms that tie today (`ternary` and `rounded binary` stay at Kinderlied):

- **Full points, no reach** (`644-forms-full.json`):
  - call and answer at `sync .75 harm .35 bite .65` (blues, West African, dance);
  - AABA at `.45 .85 .4` (song form, jazz standards);
  - period at `.15 .4 .3` and sentence at `.2 .55 .5` (classical phrasing).
- **The idiom's axes, with a reach** (`644-forms-reach.json`):
  - call and answer `sync .75 ± .25`;
  - AABA `harm .85 ± .15`;
  - period `sync .15 ± .15, harm .4 ± .1`;
  - sentence `sync .2 ± .15, harm .55 ± .1`.

| placement / distance | tied for first | the first two within 0.01 | first at 0 | a miss (> 0.3) |
|---|---|---|---|---|
| full / A today | 0 | 9 | 1 | 3 |
| full / B window, C hinge | as A (no reach written) | | | |
| reach / A today | 2 | 8 | 3 | 0 |
| reach / B window | **18** | **24** | **71** | 0 |
| reach / C hinge | 2 | 11 | 3 | 0 |

What each style finds first (the 15 styles):

| style | full / A | reach / B | reach / C |
|---|---|---|---|
| Synth-pop | sentence | period = sentence | sentence |
| Techno | sentence (0.432, a miss) | period | period |
| Deep house | sentence | sentence | sentence |
| Ambient | period | period | period |
| Lo-fi hip hop | AABA | AABA = call and answer | AABA |
| Funk | call and answer | call and answer | call and answer |
| Bossa nova | AABA | AABA = call and answer | AABA = call and answer |
| Swing jazz | AABA | AABA | AABA |
| Electro swing | AABA | AABA = call and answer | AABA |
| Spooky | AABA | AABA | AABA |
| Kinderlied | ternary | ternary | ternary |
| Acid | call and answer | call and answer | call and answer |
| Happy hardcore | sentence | period = sentence | period = sentence |
| Elektro | sentence | period = sentence | sentence |
| Dark ambient | period | period | period |

(`=`: tied exactly, broken by id. In C several firsts are within 0.01 of the second, where co-use can swap them: Synth-pop, Elektro, Lo-fi hip hop, Electro swing.)

## What reading the reach implies

1. **A hard window (B) brings #371's tie back.**
   - Every fragment whose window holds the style is at 0, so the id decides again: 18 of 120 places.
   - A weight means nothing inside a window, since 0 over any weight is 0.
   - Co-use decides wherever the first two are within 0.01: 24 places. That is where use locks in.
2. **A hinge (C) keeps the reach and the ranking.**
   - Inside the window, the nearer centre still wins; outside it, the reach shifts the edge.
   - Its two ties are geometry, not the rule: Bossa nova sits exactly on call and answer's sync and on AABA's harmony.
   - With no reach written, it is today's distance, so #644's bound ("with no reach written, every query returns what it did") holds.
3. **"A missing axis is a whole reach" (D) changes distances that exist today.**
   - It changes no ranking, since every facet names one set of axes. The five firsts that did differ among the 120 places were exact ties at halfway points, broken the other way by rounding.
   - It does move distances: a three-axis facet's shrink by √¾ against Jambot's miss distance. The forms' misses go from 14 to 6 of 120 with today's points.
   - So D and #644's bound can't both hold. D is a choice of what a missing axis means, separate from whether a reach is read.
4. **A point naming one axis stays overconfident under B and C.**
   - Its mean is over one axis, so a style that matches on that axis alone finds it at 0 (Bossa nova above).
   - D's denominator would fix that, at the cost in point 3.
   - Full points (A) avoid the question: a form names every axis it has an opinion on, and its weight says how firmly.
5. **What else moves if a query reads a reach:**
   - **lock-in** (`lockin.slow.test.ts`: at most 5 points added per facet) and the miss distance, re-measured, as #644 says;
   - **Jambot's experiments** that hold what the presets play (E42, E44, E45), re-measured at the pin that brings it;
   - **the learned layer** writes points without a reach, so a seed point with a reach and a learned point without one are measured differently. Is that wanted?
   - **the hash:** the reach is part of the association, so it stays out of a fragment's hash with the rest of it (#436's question 3, as the note on #405 proposes).
6. **The forms don't need it.**
   - Full points with today's query place every form by idiom with no tie (full / A).
   - Funk and Acid keep call and answer, Kinderlied finds ternary, and the jazz and song styles find AABA.
   - One style misses: Techno's nearest form, a sentence, is 0.432 away. It falls to Jambot's call and answer, or gets a form placed near it, by #540's coverage test.

## Recommendation

- **#371 now, on #624's axes, as full points (A):** the table's left column, adjusted where the owner hears it otherwise. It needs neither #436 nor #644.
- **#644, if the reach is read: the hinge (C), not the window (B).**
  - It keeps a reach meaningful without bringing back ties.
  - It keeps every query that writes no reach as it is.
  - Lock-in and Jambot's experiments are re-measured before it lands.
- **A missing axis stays dropped** (not D), unless the owner wants it to mean "anywhere". That is its own ruling: it moves Jambot's misses.
- **Sections follow idiom too** (the owner, 2026-11-09). That is #571's section plan and yggi/jambot#547 rung 5. Once a fragment says a song's sections, `npm run coverage -- --facet <its facet>` places it by the same measure.
