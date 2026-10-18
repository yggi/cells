# 048 · The learned layer is plain data the frontend hands each query; filing gives a point of weight 0.1, use raises the point that found a fragment to 1.25 at most, and a text held after renaming adds to the fragment that holds it; amended (#162): to 1.2 at most, the lock-in bound over 256 runs with room for its noise

**Date:** 2026-10-18 · **Status:** accepted (owner, 2026-10-18, on #152: the filing weight 0.1, use raising the point that found it by 0.1 to 1.25 at most, a filed fragment first on a tie, use adding at most 5 points to the share among the 3 most used); the cap and the measure, amended (owner, 2026-10-18, on #162: "go ahead with 162", below) · Issues: #145, #81, #49, #162

## Context

[Decision 047](047-fragments-are-files.md), point 7, made cells stateless: the seed library is cells', and what a jam learns (fragments the Muse heard or the composer made, associations use has moved, counts of use together) is the frontend's, handed to cells, which ranks a query over both.
[Decision 043](043-the-composer-selects.md) had the composer file what it generates on a miss (point 1) and use move an association (point 2), and left open whether learning by use locks onto a few fragments: "to be measured, not assumed".
[Decision 046](046-facets-and-co-use.md) counted use together in the repository object, which `used(ids)` changed: state, which 047 rules out.
[#145](https://github.com/yggi/cells/issues/145) bounds the step: an empty layer changes no query (over 1,000 points); a filed fragment is found first at its point at distance 0; lock-in measured over 10,000 sections of a walk at entropy 0.3; two repositories from the same seed and layer answer alike.

## Decision

1. **The learned layer is plain data, JSON as it stands** (`LearnedLayer`, `src/repository/fragments.ts`):
   ```json
   {
     "filed": [
       {
         "fragment": {
           "id": "composer 2026-10-18T21:04:00Z",
           "text": "&bar meter(\"9/8\")",
           "association": [{ "point": { "sync": 1, "harm": 0.1, "artic": 0.9, "energy": 0.8 }, "weight": 0.1, "facet": "meter" }]
         },
         "meta": { "source": "composer", "created": "2026-10-18T21:04:00Z" },
         "prose": ""
       }
     ],
     "points": [{ "id": "4/4 leaning on 16n", "point": { "sync": 0.5, "harm": 0.75, "artic": 0.35, "energy": 0.5 }, "weight": 1.2, "facet": "meter" }],
     "together": [{ "ids": ["4/4 leaning on 16n", "Lo-fi hip hop drums"], "count": 12 }]
   }
   ```
   `filed` holds files as `readFragment` returns them, so `writeFragment` writes each as a file and `readFragments` reads them back; use moves a filed fragment's own association, so its file carries all of it.
   `points` holds the points use added to the seed's fragments, each naming its fragment; `together` each pair once, its ids in code-unit order.
   A frontend keeps it as it likes (files, a database, SilverBullet): rows of three kinds, or files and two lists.
2. **cells merges it at each query and never stores it.** `query(…, { layer })` ranks the seed's fragments, each with the layer's points after its own, and the filed ones; `merge(layer)` shows what a query sees, and the ids the layer names that nobody holds (a seed fragment a later release dropped), which it leaves out rather than refuse.
   Filing (`fileFragment`) and use (`useFragments`) take a layer and return a new one, never changing the one given.
   A repository keeps nothing between calls but a cache of compiles by text, which changes no answer.
   `used(ids)` and the repository's `usedTogether` are gone (neither was released); `usedTogether(layer, a, b)` reads a layer.
3. **Filing gives one point, at the query's point, of weight 0.1** (`FILING_WEIGHT`), its facet, and the metadata `source` and `created` (the frontend's timestamp: cells has no clock); its id is `<source> <created>` unless given.
   A fragment is first where its distance over its weight is least, so a filed one is first within a tenth of its nearest rival's distance: where the composer files, on a miss, nothing lies within 0.3, so what it made holds the next 0.03 (two sections of the radio's walk), and use takes it farther; a fragment the Muse files beside a seed fragment 0.05 away is first only within 0.005 of where it was heard.
   At its own point it is first at distance 0, even where a seed fragment sits at 0 too: a tie goes to the filed fragment, then by id, so an empty layer ties as before.
4. **Use raises the point that found the fragment, by 0.1 (`USE_STEP`), to 1.25 at most (`USE_CAP`).**
   The point that found it is its least distance over weight, of the facet it was kept as.
   A seed point stays as written: the layer raises it with a point of its own at the same place.
   A fragment with no point of the facet gets one at the use's place, of weight 0.1.
   So use never adds a place a fragment is found at; it makes the places it has reach farther, by a quarter at most: a fragment more than 1.25 times as far as one used is never found first.
5. **Identity, until the hash:** a filed text that reads as a held fragment's (`sameText`: each declaration's code as the union reads it, comments aside and whitespace collapsed, its own names numbered in the order it declares them; the interface names and the names it uses but doesn't define as written) is that fragment: filing it is a use of that fragment at the filing's point, and says what was renamed (`&cl` → `&clave`).
   Lines in another order are another text: identity reads the text, as the hash will, and doesn't reorder it.
6. **Lock-in, bounded: use moves add at most 5 points** to the share of sections whose fragment is among its run's 3 most used, over the same walk with nothing learned, on each facet (`src/repository/lockin.test.ts`): 8 runs of 1,250 sections from the presets' points, the radio's walk at entropy 0.3 (yggi/jambot's `walkRadio` steps, keyed by `chanceOf`), a meter query then a rhythm query each section, the first within 0.3 kept and used at the section's point, a miss filed.
   Measured: meters 0.891 → 0.916 (+2.5), rhythms 0.888 → 0.921 (+3.2); the layer after a run holds 4 to 13 points, under 1.6 KB.

Why these:

- **Data, not an object**, because a frontend must store it, diff it, merge two of it and hand it back, and the files of 047 are already data; a function that returns a new layer is the whole of "stateless".
- **Raise, not add.** The issue offered both. A point added where a fragment was kept follows a walking style one section behind it, at full strength once used a few times, so the fragment wins wherever the walk goes next: the first draft, which added a point beyond 0.05 and raised one within, kept every run of 1,250 sections on its 3 most used meters and rhythms, all of it, against 76 to 100 % with nothing learned. Raising the point that found it can only move the borders the seed drew.
- **The cap, 1.25**: of 1.1, 1.25 and 1.5 it is the largest that keeps the bound with room (1.5 adds 8.5 points to the rhythms' share; 1.1 adds 1, and barely moves anything). The step barely matters (0.02 and 0.1 give the same to a point), so it is a filing's weight: a filed fragment kept ten times is as strong as a seed point.
- **A filed fragment wins its own point's tie**, so "found first at its point at distance 0" holds everywhere, and what the composer made where it judged the seed lacking is what it finds there.
- **Identity on the canonical text**, not on the union (#148): the union keeps a line given word for word and renames a colliding name, but never finds that two texts with different names are one; numbering a text's own names finds it, on the same reading of a line the union uses, and is #49's canonical form in small, until the hash replaces it.

**Why not** a mutable repository with `used()`, as 046 had it: two frontends, or one jam's restart, couldn't share or restore it, and 047 put that memory in the frontend.
**Why not** refuse a layer naming an id the seed no longer holds: a frontend's layer outlives a release, and refusing it would break the frontend at its next pin; leaving it out and naming it lets the frontend migrate.
**Why not** a weight that grows without bound (a logarithm, as 046's pull): any bound on lock-in then fails in a long enough jam.

## Amended (owner, 2026-10-18, #162)

Point 6's bound held on one draw of 8 runs, seeds 0–7, and on no other: the same walk from the same presets on seeds 8–15 had use moves add 8.0 points to the rhythms' share (3.2 on seeds 0–7), and use together 10.3 ([#162](https://github.com/yggi/cells/issues/162)).
A draw of 8 runs spreads by about 2.3 points (the standard deviation of its value from one draw to the next), so one draw can't tell 3 points from 8, and the cap (here) and the reach ([046, amended](046-facets-and-co-use.md#amended-owner-2026-10-18-162)) had each been chosen against that draw's noise.

1. **The measure is over 32 draws of 8 runs**, 256 runs of 1,250 sections (320,000), run `i` of draw `d` from the `i`th preset on the seed `8d + i` (`src/repository/lockin.ts`).
   It takes about 40 s, so it is a slow test (`lockin.slow.test.ts`, `npm run test:all`); the quick tests keep a witness over draws 0–3, 32 runs in about 5 s (`lockin.test.ts`).
2. **The bound: the pooled value plus twice its standard error is at most 5 points**, on each facet, for use moves and for use moves with use together; the standard error is the spread of the 32 draws' values over √32, 0.2 to 0.4 points.
   The slow test also holds that spread to 2.5 points, and the witness to 7.5 over its 32 runs: 5 plus twice the standard error of a pool of 4 draws at that spread (5 + 2 · 2.5 / √4).
3. **The cap is 1.2** (`USE_CAP`), and use together's reach 0.1 (046, amended): a fragment more than 1.2 times as far as one used is never found first.

Measured over draws 0–31, points added to the share among a run's 3 most used (± the standard error; the meters are the same for both ways of learning, since a meter query chooses nothing):

| cap | reach | use moves, meters | use moves, rhythms | with use together, rhythms | rhythms with use together + 2 SE |
| --- | --- | --- | --- | --- | --- |
| 1.5 | 0.1 | +4.9 ± 0.3 | +7.2 ± 0.5 | +8.0 ± 0.5 | 8.9 |
| **1.25** | **0.2** (before) | +2.2 ± 0.2 | +3.9 ± 0.4 | +6.1 ± 0.5 | **7.1** |
| 1.25 | 0.15 | | | +5.5 ± 0.4 | 6.3 |
| 1.25 | 0.1 | | | +5.0 ± 0.4 | 5.9 |
| 1.25 | 0.05 | | | +4.5 ± 0.4 | 5.3 |
| 1.25 | 0.02 | | | +4.2 ± 0.4 | 5.0 |
| 1.2 | 0.2 | +1.5 ± 0.2 | +2.5 ± 0.4 | +5.1 ± 0.4 | 5.9 |
| 1.2 | 0.15 | | | +4.6 ± 0.4 | 5.4 |
| **1.2** | **0.1** (chosen) | **+1.5 ± 0.2** | **+2.5 ± 0.4** | **+4.05 ± 0.4** | **4.9** |
| 1.2 | 0.05 | | | +3.4 ± 0.4 | 4.2 |
| 1.15 | 0.2 | +0.6 ± 0.2 | +1.6 ± 0.4 | +4.2 ± 0.5 | 5.2 |
| 1.15 | 0.15 | | | +3.5 ± 0.4 | 4.4 |
| 1.15 | 0.1 | | | +2.8 ± 0.4 | 3.7 |
| 1.1 | 0.2 | −0.4 ± 0.2 | +0.4 ± 0.3 | +2.4 ± 0.4 | 3.3 |

On draws 32–63, a pool of its own, the values before read 6.1 again with use together (6.95 with twice the error), and the values chosen read meters +2.0, rhythms +2.9, with use together +3.8 (4.5).
At the values chosen, a draw of 8 reads from −2.7 to 7.2 (use moves, rhythms) and from −1.7 to 9.8 (with use together).

Why these:

- **Over the pool, with its error**, because the value of a draw of 8 is mostly which walks the seeds drew: the same numbers read 3.2 and 8.0 on two draws. The error term makes a bound met by a lucky pool fail: what is held is what learning does, not what 256 walks happened to do.
- **Not the worst draw:** the most of 32 draws is the noise's tail (7.2 for use moves where the pool reads 2.5), moves by whole points when one run's walk flips, and would bound what one unlucky draw does.
- **32 draws**: the error falls as the square root of the runs, and at 32 draws it is under half a point, a tenth of the bound; at 4 draws it is 1.2, so 32 runs can witness only a gross change, which is what the quick test does.
- **1.2 and 0.1, one step each**: neither number alone meets the bound. The reach alone needs less than 0.02 (at 0.02 the total sits on the line, 4.98), a pull of 0.002 at the default: no pull. The cap alone needs 1.1, where use moves add nothing to the meters (−0.4). Of the pairs a step of 0.05 from the old ones, only (1.2, 0.1) meets it; (1.15, 0.15) does too, moving the cap twice as far and taking the meters' learning from 1.5 points to 0.6.
- **The step stays 0.1**: at the cap of 1.2, a step of 0.02, 0.05 or 0.1 gives the same within half a point.

The rest of 048 and 046 holds: an empty layer, or none, changes no query; a filed fragment is first at its point; at equal distance 5 uses outrank 0 at any pull above 0; a pull of 0 ranks as nothing chosen.

## Open

- **Use together locked in more than use moves:** over the same walk, 046's pull, λ · ln(1 + n), added 9.3 points to the rhythms' share (to 0.981), since a rhythm used with its meter hundreds of times was pulled 0.6 nearer, past any style distance. [#151](https://github.com/yggi/cells/issues/151) bounds it ([046, amended](046-facets-and-co-use.md#amended-owner-2026-10-18-151)): the count saturates at 10 uses, a known group pulls 0.02 at the default, and the pull is the query's; with use together the rhythms' share is 0.935 (+4.7), and `lockin.test.ts` holds both ways of learning to 5 points.
- Learning shortens distances, so a fragment used often is no longer a miss where it was: over the walk's 10,000 sections, the composer files 2 new fragments and 2 texts held already, where the seed alone misses 553 times (meters 349, rhythms 204); each new one is found again the section after it is filed (sections 1,046 and 1,147 of their runs).
- The hash (#46, #28) replaces identity on the canonical text, and keys the layer's rows by hash instead of id.

## Consequences

- Jambot's meter query (`createRepository(METER_FRAGMENTS).query(point)`) is unchanged: with no layer, or an empty one, every query ranks as before (over 1,000 points); a layer that learned only rhythms changes no meter query.
- A frontend files on a miss with `fileFragment(repository, layer, { text, point, facet, source, created })`, writes `filed.file` with `writeFragment`, and after each section hands `useFragments(repository, layer, kept)` the fragments it kept and where.
