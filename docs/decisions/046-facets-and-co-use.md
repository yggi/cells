# 046 · A fragment names its facet and a query names the facet it asks for; how often fragments were used together pulls a fragment nearer by λ·ln(1 + n), λ = 0.1

**Date:** 2026-10-18 · **Status:** proposed (the form and λ are the implementer's choice that #138 asks to be named; the owner's review of #138 accepts or changes them) · Issues: #138, #81 (the rung *Rhythms as fragments*), #49

## Context

[Decision 041](041-fragments-by-style.md) made the repository one list of fragments ranked by style distance, and its only library was the meters.
[#138](https://github.com/yggi/cells/issues/138) adds the second, the rhythms (E31's drum bars and four claves), and two needs come with it:

- **A meter query must stay a meter query.** Jambot's composer asks for its meter at a section's start (yggi/jambot#375, #384) and must never be handed a drum bar; decision 043 orders the queries, the meter first, then the rhythms that fit it.
- **Fragments come in groups** (decision 043, point 4): a drum bar and the clave it was played with go together, so how often fragments were used together ranks beside the style point. #138 bounds it: a fragment used 5 times with what is chosen outranks one at the same distance used 0 times; two fragments 0.3 apart keep their order for every count below 10.

## Decision

- **A facet** is an optional name on a fragment (`facet: 'meter'`, `'rhythm'`), and a query may name one (`query(point, k, axisWeights, { facet })`): it then ranks only that facet's fragments.
  A query that names none ranks all, as before.
  The repository compares facets as it compares axes, by name, and knows none of them.
  Every meter is `meter`, every rhythm `rhythm`.
- **Used together:** `used(ids)` records that these fragments were used together: the count of each pair among them goes up by one, kept in the repository object (nothing is persisted yet), and `usedTogether(a, b)` reads it.
  An id it doesn't hold is an error.
- **The score:** a query may name the fragments already chosen (`{ chosen }`).
  A fragment's score is `distance − λ · ln(1 + n)`, where n is the sum of its counts with each chosen fragment, and **λ = 0.1** (`CO_USE_PULL`).
  The query ranks by score, then by id; each result carries its distance (the style alone, which a composer's miss is judged on) and its score.
  With nothing chosen, or no use recorded, the score is the distance and every ranking is what it was.

Why these:

- **Subtracted, in units of distance**, so λ reads directly against the distances the composer already uses: Jambot's miss is 0.3, its hold 0.02.
- **The logarithm**: each doubling of uses pulls the same (λ · ln 2 ≈ 0.07), so a pair used a hundred times pulls only twice as far as one used nine times; the query doesn't lock onto the groups it has seen most (decision 043's open question), and the style stays in charge.
- **λ = 0.1**: under the bound, λ · ln 10 < 0.3 needs λ < 0.13; at 0.1, fewer than 10 uses pull at most 0.23, a fragment 0.3 farther takes the lead at its 20th use (λ · ln 21 ≈ 0.304, λ · ln 20 ≈ 0.300), and a single use (0.07) is more than Jambot's hold, so a group that was played once is already preferred among fragments that fit the style about as well.
- **The sum before the logarithm**, not a sum of logarithms: what a count can do doesn't depend on how many fragments are chosen, so the bound holds on a full workbench as on one with only its meter.

**Why not** a facet as an axis or a tag inside the association: a style point says where a fragment is found, not what kind of part it is, and a meter query that didn't name the axis would still see the rhythms.
**Why not** a repository per facet: fragments of different facets are used together, and their counts live in one place.
**Why not** a linear pull, λ · n: it grows without bound, so a pair used often enough beats any style distance.
**Why not** a factor on the distance, distance / (1 + λ · n): it can't move a fragment that sits at the query's point, and pulls a far one hardest.

## Consequences

- Jambot's meter query is over `METER_FRAGMENTS`, an export whose ids, texts and associations are unchanged (each entry gains `facet: 'meter'`); its reading of a fragment rejects one with no `&bar` meter anyway. Over the whole library, a query naming `meter` returns what the meters alone return (`src/repository/library.test.ts`, 661 points).
- `Found` carries `score` beside `distance`; a frontend that ranks by distance itself sees the same order while it chooses nothing.
- Use moving an association, and persisting the counts, are later steps of #49; so are queries that fit the workbench (a two-bar clave only under a meter that holds it).
