# 048 · The learned layer is plain data the frontend hands each query; filing gives a point of weight 0.1, use raises the point that found a fragment to 1.25 at most, and a text held after renaming adds to the fragment that holds it

**Date:** 2026-10-18 · **Status:** proposed (#145; the owner rules on the pull request) · Issues: #145, #81, #49

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

## Open

- **Use together locks in more than use moves:** over the same walk, counting and weighing use together (046's pull, λ · ln(1 + n)) adds 9.3 points to the rhythms' share (to 0.981; Synth-pop's, Techno's, Deep house's, Ambient's and Lo-fi's runs keep their 3 most used rhythms every section), since a rhythm used with its meter hundreds of times is pulled 0.6 nearer, past any style distance. Recorded under 10 points in `lockin.test.ts`; bounding the pull (a count that saturates, or fades as the workbench's memory does) is [#151](https://github.com/yggi/cells/issues/151).
- Learning shortens distances, so a fragment used often is no longer a miss where it was: over the walk's 10,000 sections, the composer files 2 new fragments and 2 texts held already, where the seed alone misses 553 times (meters 349, rhythms 204); each new one is found again the section after it is filed (sections 1,046 and 1,147 of their runs).
- The hash (#46, #28) replaces identity on the canonical text, and keys the layer's rows by hash instead of id.

## Consequences

- Jambot's meter query (`createRepository(METER_FRAGMENTS).query(point)`) is unchanged: with no layer, or an empty one, every query ranks as before (over 1,000 points); a layer that learned only rhythms changes no meter query.
- A frontend files on a miss with `fileFragment(repository, layer, { text, point, facet, source, created })`, writes `filed.file` with `writeFragment`, and after each section hands `useFragments(repository, layer, kept)` the fragments it kept and where.
