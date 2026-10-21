# 055 · Recognition: which fragment a heard text is, by which of Vary's operators, and how far: the notes compared as Vary reads them, a recogniser warmed on the library, the share kept by the frontend

**Date:** 2026-10-21 · **Status:** proposed · Issues: #224, #208, #180, #194, #49, #46, yggi/jambot#237

## Context

Jambot's loop and its homeostat (yggi/jambot#237) need a sensor: of the bars the Muse writes, how many are something the band already knows, a seed fragment or one it filed, or one of their variations? Rung 1 there asks for recognition with a tolerance. Rung 6 drives the novelty ladder (decision 043, point 5) by the share of bars recognised. The owner (2026-10-21) named the style vector and the homeostat a major interest.

Two decisions already hold most of the answer:

- [Decision 052](052-variations-as-operators.md) put the ladder's operators in cells: rotate, drop and add on lines of hits, transpose, invert and reverse on pitched lines (#208). `variations` gives every variation of a fragment on its workbench, each S2-distinct from its source and from every one before it. It reads the notes off the text in one compile, and doesn't compile each variation.
- [Decision 050](050-the-equalities.md) named the equalities. "Is this that fragment" is S2: the same voice, onset, length and pitch, with the levels free. A drum part the Muse writes again with other velocities is still the same groove.

What is missing is the reverse question. Given a heard text and a library, which fragment is it, by which operator path, and how far?

## Decision

### 1. `recognise(text, library, options)`: the nearest fragments, each with its path and its distance

`createRecogniser()` (`src/repository/recognise.ts`) returns a recogniser. Its `recognise(text, library, options)` gives the library's fragments that the heard text is within the tolerance, each once, by its nearest path:

```ts
interface Recognised {
  readonly fragment: Fragment;
  /** The operators that map the fragment to the heard text, first to last: none, one or two. */
  readonly path: readonly { operator: Operator; line: string; by: string }[];
  /** The notes that differ (S2): those the heard text plays that the path doesn't, and the reverse. */
  readonly distance: number;
}
interface RecogniseOptions extends VaryOptions {
  // workbench, keep, fewest, degrees as Vary takes them; operators: by default all six
  readonly tolerance?: number; // notes, a whole number ≥ 0; by default 0
  readonly depth?: 0 | 1 | 2; // the longest path; by default 1
}
```

- **The order:** by distance, then the shorter path, then the library's order. A fragment is reported by its nearest path, and among paths at one distance by the shortest, then by Vary's order.
- **Recognised** means the list is not empty. The homeostat counts a bar as recognised when it is. The tolerance is the licence's n notes.
- **What is never recognised:** a fragment that plays no notes Vary reads (a meter, a harmony's chords) is never a match. A heard text that plays none (one that doesn't compile, or one written in forms Vary doesn't read) recognises nothing.
- **The library** is the frontend's: `repository.merge(layer).fragments`, the seed and the filed fragments, as a query sees them.

### 2. The distance: the notes, as Vary reads them

A note is one key: its onset in whole notes, its length (its line's step), the sound it strikes and a pitched note's pitch (the table it reads, its degree there, its accidental and its grid steps).

- **The sound** is the drum's General MIDI note (`gmDrumNote`) where it has one, else the voice as written.
- **The distance** is the size of the symmetric difference of the two multisets of notes: the notes one plays and the other doesn't, counted both ways.
- A drop is 1 from its source, an add is 1, a rotation of a line of k hits is up to 2k, and a transposition of k notes is 2k.
- **Levels are free** (S2): a hit written again at another velocity is the same note.

This is decision 050's S2 as Vary already computes it (`lines.ts`), not over compiled events. A heard text costs one compile, and every variation in the library is read in the compile of its source, the way `variations` reads them.

The cost is reach. A text Vary can't read (`@`, a choice, a subsequence of degrees) is never recognised. A pitched voice is compared by the name it is written under, so a pitched line whose voice is renamed (E2) is not the same note. Both are named in the consequences.

Vary's reader now reads back what its own pitched operators write: a splice moved or mirrored (`degree(&bassNext^$-1, -2)`, `inverse(&bassNext)`). Without that, a transposed walking bass couldn't be recognised as one, and Vary couldn't vary a variation of it.

### 3. Paths: none, one operator, or two

- **Depth 1**, the default: the fragment itself and each of its variations under the options (`variations`, with the frontend's `keep` and `fewest`), all six operators unless the options name fewer.
- **Depth 2:** each variation's own variations as well. This costs a compile per variation when the recogniser warms (about 2 s over the library on E31's workbench) and nothing extra afterwards. It is an option because a homeostat that counts "a variation of something known" needs depth 1, and depth 2 is for asking how far a jam has wandered.
- **No inverse operators, and no meet-in-the-middle:** rotate has no inverse among the six, so a path is only ever read forwards, from the fragment towards the heard text.

### 4. Stateless, with a cache that changes no answer

The recogniser keeps each fragment's readings by its text and by the options it was read under, the same way `createRepository` keeps compiles by text (`cachedFit`, #194). It stores nothing a frontend has to keep, and two recognisers give the same answer. The share of bars recognised, the window it is counted over, and the ladder it moves are the frontend's (decision 048: the repository is stateless; decision 052, point 1: the policy is the frontend's).

### 5. Measured (`src/repository/recognise.test.ts`)

- **Jambot's 284 variations on E31's bars** (#216), recognised against the whole library (36 fragments) on Jambot's workbench with `keep: ['&fill']` and `fewest: 3`. Each is recognised as its source's, by its own operator, at distance 0, and 282 of them come first.
  The other 2 come second, behind a fragment at distance 0 by no operator at all. Lo-fi hip hop's bar and Bossa nova's differ by one hat (and their levels), so Lo-fi hip hop with `drop &hat 4` plays Bossa nova's bar, and Bossa nova with `add &hat 4` plays Lo-fi hip hop's. The shorter path is the better answer here: the bar played is that seed.
- **The bass seeds' 24 variations** (#218) on their workbench over I–vi–IV–V, each recognised first as its source's, by its operator, at distance 0.
- **1,000 seeded random bars of hits** (a kick, a snare and a hat line, each step struck with chance 1/4): none is recognised at tolerance 0. None is recognised at tolerance 2 or 4 either (a probe, not committed).
- **The cost**, on a recogniser warmed on the library (one recognition, about 150 ms): every recognition compiles only the heard text, one compile, counted. Over 1,000 random bars it took 1.4 ms at p50 and 2.7 ms at p95 at depth 1 and tolerance 0, 1.9 ms at p95 at tolerance 4, and 3.0 ms at p95 at depth 2 (warmed in about 2 s). The bound is 5 ms at p95. Under the whole quick suite's load one run measured 5.1 ms, so the test gates on the compile count, as #194's does, with 25 ms as a gross witness.

### 6. For the owner

1. **The distance as S2 over Vary's reading, not over compiled events?** Recommended: yes, as above. Recognising over compiled events would reach every text the language compiles, but it would compile every variation in the library (284 on E31 alone, about 14 ms an S2 check, decision 052, point 5), which is far over the cost bound. The reach can grow with Vary's reader.
2. **Ties go to the shorter path** (Lo-fi hip hop's drop is Bossa nova's bar)? Recommended: yes. The list still holds both, each by its own path, so a frontend that wants a lineage reads further down it.
3. **Depth 2 an option, depth 1 the default?** Recommended: yes, for the cost in section 3.
4. **The tolerance in notes, the symmetric difference?** Recommended: yes. It is the count the licence names, and a drop or an add is 1. A rotation counts as up to 2k because it moves k notes. Read as a path, it costs one operator.

## Why

- **The operators already enumerate the neighbourhood.** Decision 052's `variations` lists every fragment one operator away, S2-distinct and in one compile. Recognition is that list, read the other way and indexed by notes. No second model of what a variation is can drift from Vary's.
- **S2 is what "the same groove" means:** the same voice, onset, length and pitch, the levels free (decision 050). That is what a listener and the homeostat count as known.
- **Cheap enough to run on every bar.** One compile per recognition, and the library's readings are kept across calls, so the homeostat can sense each bar the Muse writes within Jambot's budget.

**Why not** a hash of each fragment and its variations (E4, #49): a hash finds an exact match only, and the tolerance needs a distance. The signature compared at tolerance 0 is that exact match already, over notes rather than text.
**Why not** recognition by style (`query` at the bar's style point): the style vector says where a bar is, not what it is. Two bars of one style can share no note.

## Consequences

- Jambot (yggi/jambot#237, rungs 1 and 6): the homeostat calls `recognise` on each bar the Muse writes, against the seed and its layer's filed fragments, and keeps the share recognised itself.
- `@yggi/cells/repository/recognise` (`createRecogniser`, `ALL_OPERATORS`, and in `index.ts`). `@yggi/cells/engine/vary/index` gains `readVariations`, `variations` with each variation's notes and its source's. `variations` gives what it did.
- Vary's reader reads back its own pitched writes (`degree(…)`, `inverse(…)` around a splice), so a transposed or inverted bass varies again. No piece sounds different.
- Left for later: a pitched voice compared by its place rather than its name (as S1 numbers voices, #186). Vary's reader would need the same.
