# 046 · Each point of an association may name the facet it is found under, a hint a query names; how often fragments were used together pulls a fragment nearer by λ·ln(1 + n), λ = 0.1; amended (#151): the count saturates at 10 uses, a known group pulls 0.2 · λ, and λ is the query's `pull`

**Date:** 2026-10-18 · **Status:** accepted (owner, 2026-10-18, on #141: the facet a hint on each association point, not a classifier of the fragment; the co-use score and λ as built); where the counts live, superseded by 048 (a learned layer the frontend hands each query, `used(ids)` gone); the score's form, amended (owner, 2026-10-18, on #151: "all 3 as suggested", below) · Issues: #138, #81 (the rung *Rhythms as fragments*), #49, #151

## Context

[Decision 041](041-fragments-by-style.md) made the repository one list of fragments ranked by style distance, and its only library was the meters.
[#138](https://github.com/yggi/cells/issues/138) adds the second, the rhythms (E31's drum bars and the claves), and two needs come with it:

- **A meter query must stay a meter query.** Jambot's composer asks for its meter at a section's start (yggi/jambot#375, #384) and must never be handed a drum bar; decision 043 orders the queries, the meter first, then the rhythms that fit it.
- **Fragments come in groups** (decision 043, point 4): a drum bar and the clave it was played with go together, so how often fragments were used together ranks beside the style point. #138 bounds it: a fragment used 5 times with what is chosen outranks one at the same distance used 0 times; two fragments 0.3 apart keep their order for every count below 10.

A first draft put one facet on the fragment.
The owner ruled it a hint, and one that belongs to where the fragment is found: "the bell is a world-music associated rhythm-facet and a western music associated harmony / scale-facet".

## Decision

- **A facet is a hint on each point of an association** (`{ point, weight, facet: 'rhythm' }`): what the fragment is associated as, there.
  A fragment can be a rhythm near one style and a scale near another.
  A point that names no facet counts for every facet.
- **A query may name a facet** (`query(point, k, axisWeights, { facet })`): it measures each fragment over its points of that facet (and those that name none), and leaves out a fragment with no such point.
  A query that names none measures every point, as before.
  The repository compares facets as it compares axes, by name, and knows none of them.
  Every meter's points are associated as `meter`, every rhythm's as `rhythm`.
- **A facet is not what a fragment can fill.** Whether a fragment fits the workbench (a two-bar clave only under a meter that holds it, a fragment over `&key` only where a key is) is read off its text by the fit check, [#49](https://github.com/yggi/cells/issues/49)'s next step, never off its facets.
- **Used together:** `used(ids)` records that these fragments were used together: the count of each pair among them goes up by one, kept in the repository object (nothing is persisted yet), and `usedTogether(a, b)` reads it.
  An id it doesn't hold is an error.
- **The score:** a query may name the fragments already chosen (`{ chosen }`).
  A fragment's score is `distance − λ · ln(1 + n)`, where n is the sum of its counts with each chosen fragment, and **λ = 0.1** (`CO_USE_PULL`).
  The query ranks by score, then by id; each result carries its distance (the style alone, which a composer's miss is judged on) and its score.
  With nothing chosen, or no use recorded, the score is the distance and every ranking is what it was.
  The count saturates and λ is the query's: *Amended* below.

Why these:

- **The facet on the point**, because an association is where a fragment was found, made or kept (decision 043, point 2), and what it was used as is part of that: the same text can serve as different parts in different musics.
- **Subtracted, in units of distance**, so λ reads directly against the distances the composer already uses: Jambot's miss is 0.3, its hold 0.02.
- **The logarithm**: each doubling of uses pulls the same (λ · ln 2 ≈ 0.07), so a pair used a hundred times pulls only twice as far as one used nine times; the query doesn't lock onto the groups it has seen most (decision 043's open question), and the style stays in charge.
- **λ = 0.1**: under the bound, λ · ln 10 < 0.3 needs λ < 0.13; at 0.1, fewer than 10 uses pull at most 0.23, a fragment 0.3 farther takes the lead at its 20th use (λ · ln 21 ≈ 0.304, λ · ln 20 ≈ 0.300), and a single use (0.07) is more than Jambot's hold, so a group that was played once is already preferred among fragments that fit the style about as well.
- **The sum before the logarithm**, not a sum of logarithms: what a count can do doesn't depend on how many fragments are chosen, so the bound holds on a full workbench as on one with only its meter.

**Why not** a facet on the fragment: it classifies the text once for every style, where the bell is a rhythm in one music and a scale in another; and a classifier is what the fit check reads off the text.
**Why not** a facet as an axis of the style point: a point says where a fragment is found, not what it is used as there, and a meter query that didn't name the axis would still see the rhythms.
**Why not** a repository per facet: fragments of different facets are used together, and their counts live in one place.
**Why not** a linear pull, λ · n: it grows without bound, so a pair used often enough beats any style distance.
**Why not** a factor on the distance, distance / (1 + λ · n): it can't move a fragment that sits at the query's point, and pulls a far one hardest.

## Amended (owner, 2026-10-18, #151)

Over decision 048's lock-in walk (8 runs × 1,250 sections, `src/repository/lockin.test.ts`), the score above grew without bound: a rhythm used with its meter 500 times was pulled λ · ln 501 ≈ 0.62 nearer, past any style distance, and use together added 9.3 points to the share of sections whose rhythm is among its run's 3 most used (0.888 → 0.981).
The owner ruled the three parts apart:

1. **How well a group is known saturates (cells, long-term).**
   A fragment's score is `distance − pull · 0.2 · ln(1 + min(n, 10)) / ln 11` (`coUseScore`): the logarithm as before, so each doubling of uses pulls the same, until **10 uses** (`CO_USE_KNOWN`), past which more add nothing; a group known so pulls **0.2 times the pull** (`CO_USE_REACH`), 0.02 in distance at the default, Jambot's hold distance.
   The counts in the layer don't fade.
2. **How strongly to keep groups now is the frontend's (a query option).**
   `query(…, { pull })`, a number ≥ 0, `CO_USE_PULL` (0.1) where it says none; 0 ranks exactly as a query with nothing chosen.
   A composer sets it from its novelty ladder (decision 043, point 5): strong to repeat and vary, weak or 0 to fetch nearby and far, moved by entropy and later the homeostat.
   cells knows no axis and no ladder.
3. **What was used lately is the workbench's** (the frontend's fading short-term memory), not the repository's: cells has no recency.

Measured, over the walk at the default pull, the share among a run's 3 most used, against 0.891 (meters) and 0.888 (rhythms) with nothing learned:

| learning | meters | rhythms |
| --- | --- | --- |
| use moves | 0.916 (+2.5) | 0.921 (+3.2) |
| use moves and use together, before (λ · ln(1 + n)) | 0.916 (+2.5) | 0.981 (+9.3) |
| use moves and use together, amended | 0.916 (+2.5) | 0.935 (+4.7) |

The meters don't move: a meter query chooses nothing.
The bound, 5 points for meters and rhythms as for use moving associations (048, point 6), is now `lockin.test.ts`'s for both ways of learning.

Why these:

- **A curve that levels off, not a cap on n alone**: one use already pulls λ · ln 2 ≈ 0.07, and a cap of 1 still adds 6.8 points (0.956); every cap from 1 to 1,000 adds between 6.8 and 9.3. What locks in is the most a known group pulls: a hysteresis as wide as that pull, which a walk of 0.014 a section seldom crosses. So the ceiling decides, and the ramp below it barely does (10 uses or 5, 8, 12 or 20 add within 0.3 points of each other).
- **0.2** is the largest reach of those measured that meets the bound with room: 0.25 adds 5.0 points, 0.3 adds 5.7 (a single run's walk flips between them, so the measure moves by a point from one value to the next, and the bound wants that room). At 0.02 a known group is preferred among fragments that fit the style about as well as Jambot's hold judges them, and never reverses two that fit it differently: two fragments 0.3 apart, Jambot's miss, keep their order at every count, where before the farther led from its 20th use.
- **10 uses**: a group used together 10 times is known; the logarithm up to it keeps 046's shape, so the first uses count most. Over 1,250 sections the cap barely shows (the same curve uncapped adds 4.9 points, its most used pairs pulling 0.06); it is what holds the bound in any longer jam, where uncapped a million uses would pull 0.115.
- **The pull in units of λ**, so a frontend's `pull` reads as λ did, and a stronger pull (repeat) reaches farther in proportion: at 1, a known group pulls 0.2.
- **046's own bound holds**: at equal distance, a fragment used 5 times with what is chosen outranks one used 0 times, at any pull > 0.

**Why not** a count that fades: what was used lately is the workbench's, which the frontend keeps; the layer's counts are how well a group is known, and stay.
**Why not** a negative pull, pushing groups apart: the far end of the ladder is a pull of 0 and a far point; a pull below 0 is refused.

## Consequences

- Jambot's meter query is over `METER_FRAGMENTS`, an export whose ids, texts and points are unchanged (each point gains `facet: 'meter'`); its reading of a fragment rejects one with no `&bar` meter anyway. Over the whole library, a query naming `meter` returns what the meters alone return (`src/repository/library.test.ts`, 661 points).
- `Found` carries `score` beside `distance`; a frontend that ranks by distance itself sees the same order while it chooses nothing.
- The fit check, use moving an association, and persisting the counts are later steps of #49.
