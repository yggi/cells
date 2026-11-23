# 099 · A style named in a declaration is read on the axes its facet speaks to: a meter's `&funk` is Funk's sync, harm and bite

**Date:** 2026-11-23 · **Status:** accepted (the owner on #902, 2026-11-23: the meter fragment "should use named style points and offsets"; on #900, go ahead with the recommended rule, the facet's) · Issues: #900, #902, #536 · Amends [089](089-the-association-in-the-text.md) §1 (what a name in `style=` reads)

*Read with [041](041-fragments-by-style.md) (a point names the axes it speaks to) and [076](076-the-style-axes.md) §2 (a meter, a rhythm, a performer, a module or a form leaves `mood` out).*

## Context

A declaration's `style=` names a point as a style of `styles` (`&funk`, 089 §1) or inline (`&(map=style sync=… harm=… bite=…)`).
A name gave the style's whole point, `mood` included.
076 §2 has the facets of time and form leave `mood` out, and a distance runs over the axes both points have, so their inline points name three axes.
A meter written with names would have weighed mood in every query between presets, where today's points don't: the names the owner asked for would have moved what is found.

Measured on `meter` (`docs/notes/meter-fragment-refined.md`): all 13 straight 4/4 points and all 5 swing points but Acid's are a style's exactly, on three axes.

## Decision

1. **A style named in a declaration is read on the axes its facet speaks to.**
   - `meter`, `rhythm`, `performer`, `module` and `form` speak to `sync harm bite`, so a named style there is its point without `mood`.
   - Every other facet, and a declaration of no facet, reads all four.
   - The facet is the line's: its `facet=`, else its folder's.
2. **One table says it**: `FACET_AXES` (`src/repository/declarations.ts`), beside `FOLDER_FACETS`.
3. **An inline point is as written:** it names its axes already (041).

## Why

- **076 already rules by facet**, so the table is its rule written once, not a new one.
- **A name then means the same place as the numbers it replaces**, so a fragment can be rewritten with names and every query finds what it found.

**Why not** the fragment's axes (a fragment whose inline points leave an axis out leaves it out of its names): it is a rule each fragment would carry, read from its other points, and a fragment of names only would have none.
**Why not** a projection written at each name (`&funk` without mood): every meter, rhythm and performer would write it, saying what 076 says.

## Consequences

- No fragment of those five facets names a style today, so nothing moves: `npm run coverage` is the same before and after.
- The meter fragment can be written with names (#902); so can the rhythms and the performers, as a change of their own.
- Tests: `declarations.test.ts`.
