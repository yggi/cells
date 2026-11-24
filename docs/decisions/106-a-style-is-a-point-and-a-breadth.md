# 106 · A style is a point and a breadth: a genre's area, and a sub-genre within it

**Date:** 2026-11-24 · **Status:** accepted (the owner on #947, 2026-11-24: "a new pop style … genres and sub-genres as styles with a range and offsets … synth-pop sits 'within' pop"; #952 approved, 2026-11-24) · Issues: #947, #946, #644, yggi/jambot#760 · Amends [089](089-the-association-in-the-text.md) §6 (what a reach on a style of the library means)

*Read with [063](063-the-score-and-the-band.md) §3 (the library of styles) and [100](100-an-offset-from-a-style-is-a-sum.md) (an offset from a style is a sum).*

## Context

The library's styles were points: Synth-pop was `sync=.3 harm=.45 bite=.55 mood=.5`, and nothing said how far Synth-pop reaches, or that it is a kind of pop.
The owner, on #947, asked for Pop as a style, and for genres and sub-genres as styles with a range: Pop wide, Synth-pop a narrower area at a delta from Pop's centre, so Synth-pop sits within Pop.
089 §6 already lets a style cell write a reach on an axis, `bite=.55 ± .1`: the parser keeps it, and no query reads it (#644).

## Decision

1. **A style of the library may have a breadth:** its reach on each axis it writes one on, `sync=.3 ± .15`, the area a genre spreads over around its centre.
   - `STYLES` carries it as `reach`, beside `point`; a style that writes none is a point, as before.
   - The point is the centre, and it is what `style=`, a pick and a query read.
2. **A sub-genre lies within its genre:** on every axis, its area (its point ± its reach, a point where it has none) is inside its genre's.
   `within(inner, outer)` says so.
3. **Pop is the 24th style,** the first with a breadth, appended last so the presets' order holds:
   `&pop map=style label="Pop" step=116bpm sync=.3 ± .15 harm=.4 ± .2 bite=.5 ± .25 mood=.7 ± .3`.
   - Its centre: mostly straight, triads and a seventh, middling bite, bright.
   - Its breadth: from the ballad to dance pop on sync and bite, from the bittersweet to the euphoric on mood.
   - Its tempo, 116 bpm, is a pop song's middle.
4. **Synth-pop is its first sub-genre:** its point stays where it was, and it gains a breadth of ± .1 on each axis, inside Pop's.
   Of the other styles, which are points, Deep house also lies within Pop's area; Sea shanty, at sync .1, does not.

## Why

- **A genre is an area, not a point.** A query that finds Pop's fragments at Pop's centre alone can't tell a ballad from dance pop; a breadth says where Pop still is, and #644's reach in a query is where it would be read.
- **The breadth is 089 §6's reach**, already parsed and kept: one spelling for how sure a point is and how far a style spreads, and no new attribute.
- **Within is a box on each axis,** the simplest reading of a reach, and the one `window` measures in #644's note.
- **Pop at the end** keeps every preset's index, so a frontend that offers them in order (Jambot's preset buttons) changes only by one more.

**Why not** a sub-genre written as its genre plus an offset (`[&pop + &(map=style harm=.05 bite=.05 mood=-.2)] ± .1`, decision 100's sum): a library style's point is four numbers in its braid, read so by `STYLES`, by `styleNamesIn` and by the compile, and the parser's style cell has no sum. It would be a new form of a style cell, so it is an issue of its own (#954), and nothing here waits on it.
**Why not** a `genre=` attribute naming Synth-pop's genre: `within` reads it off the areas, so the text would say it twice and could disagree.

## Consequences

- No point moves, so no piece moves: `npm run coverage` gives every one of the 23 styles the same first in every facet, and adds Pop's row.
- The `styles` collection's association gains Pop's point; a name in `style=` carries the point, not the breadth.
- Pop's progressions are seeds at Pop (#947): `authentic_cadence`, I–IV–V–I, its first harmony, and `four_chord_pop`, I–V–vi–IV, beside it.
- Pop finds its own parts where every style does, at distance 0: it is added to the points of `finale` (its ending), `synth_pop_drums`' fill, `stick_count` and `plain`. Its form is `sentence`, Synth-pop's, found beside it. Of every other style, only Ambient's second count moves (`stick_count`, 0.370 to 0.301).
- Tests: `styles.test.ts` (the breadth, within, and which styles lie within Pop).
- Open: a query that reads the breadth (#644); a sub-genre written as its genre plus an offset (#954).
