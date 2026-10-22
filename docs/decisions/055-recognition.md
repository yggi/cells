# 055 · Recognition: which fragment a heard text is, by which of Vary's operators, from which bar, and how far: the notes compared as Vary reads them (a pitched voice by its place), a recogniser warmed on the library, the share kept by the frontend

**Date:** 2026-10-21 · **Status:** accepted (owner, 2026-10-21, on #230: the four questions in point 7 as recommended, and three asks settled before it left draft: a pitched voice by its place, the window a heard bar is counted over, the learned layer) · Issues: #224, #208, #180, #194, #49, #46, yggi/jambot#237

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
  /** The bar of the fragment's lap the heard text was matched from: 0 where the heard text is as long as the lap or longer. */
  readonly bar: number;
  /** The notes that differ (S2): those the heard text plays that the path doesn't, and the reverse. */
  readonly distance: number;
}
interface RecogniseOptions extends VaryOptions {
  // workbench, keep, fewest, degrees as Vary takes them; operators: by default all six
  readonly tolerance?: number; // notes, a whole number ≥ 0; by default 0
  readonly depth?: 0 | 1 | 2; // the longest path; by default 1
}
```

- **The order:** by distance, then the shorter path, then the earlier bar, then the library's order. A fragment is reported by its nearest path, and among paths at one distance by the shortest, then by the earliest bar, then by Vary's order.
- **Recognised** means the list is not empty. The homeostat counts a bar as recognised when it is. The tolerance is the licence's n notes.
- **What is never recognised:** a fragment that plays no notes Vary reads and defines no harmony (a meter, an instrument) is never a match. A heard text that plays none (one that doesn't compile, or one written in forms Vary doesn't read) recognises nothing.
- **The library** is whatever the frontend passes: the seed library and its learned layer, `repository.merge(layer).fragments`, as a query merges them. A groove the band filed is recognised as a seed is, and the composer's variation of it by the `by` it was filed with (`varies`, `by`, decision 052, point 4).

### 2. The distance: the notes, as Vary reads them

A note is one key: its onset in whole notes, its length (its line's step), the sound it strikes and a pitched note's pitch (the table it reads, its degree there, its accidental and its grid steps).

- **The sound** is the drum's General MIDI note (`gmDrumNote`) where it has one, else the voice as written.
- **A pitched voice by its place** among the pitched lines' voices, in the order the text declares them (`&bassV` is the first), as S1 numbers voices (#186, decision 050). A seed's `&bass * &bassV` and the Muse's `&low * &lowV` playing its notes are the same notes. Names are words (decision 037), and the table a line reads is an interface name (`&harm`, `key`), so it stays.
- **A harmony** the fragment defines itself (a braid of stacks that no card plays, `&harm`, on the meter) counts each chord's degrees as notes: its onset, length, place among the fragment's harmonies, table, degree and accidental. So a vamp is recognised as a bass line is. A harmony the workbench defines is the workbench's and counts for neither side.
- **The distance** is the size of the symmetric difference of the two multisets of notes: the notes one plays and the other doesn't, counted both ways.
- A drop is 1 from its source, an add is 1, a rotation of a line of k hits is up to 2k, and a transposition of k notes is 2k.
- **Levels are free** (S2): a hit written again at another velocity is the same note.

This is decision 050's S2 as Vary already computes it (`lines.ts`), not over compiled events. A heard text costs one compile, and every variation in the library is read in the compile of its source, the way `variations` reads them.

The cost is reach. A text Vary can't read (`@`, a choice, a subsequence of degrees) is never recognised.

Vary's reader now reads back what its own pitched operators write: a splice moved or mirrored (`degree(&bassNext^$-1, -2)`, `inverse(&bassNext)`). Without that, a transposed walking bass couldn't be recognised as one, and Vary couldn't vary a variation of it.

### 3. The window: a heard text against a fragment's lap

Every note's onset is counted from its lap's start. A text's span is the least common multiple of its lines' laps (and its harmonies'), and its bar is its meter's.

- **A heard text shorter than the fragment's lap** (one bar of the two-bar claves, one bar of an eight-bar vamp, #221) is matched against a window of its own span, starting on each of the fragment's bars, the lap read round. The nearest window is the fragment's distance, and its first bar is `bar`. One bar of the bossa nova clave, its second, is that clave from bar 1. The fifth bar of the vamp to the seventh is that vamp from bar 4.
- **A heard text as long as the lap or longer** is matched against the lap repeated over its span, from the start (`bar` 0). Two bars of a one-bar groove are that groove. A two-bar clave is not matched from its second bar, so a 2-3 clave is not the 3-2 one turned.
- **A line whose grid is none of the meter's** has no onset in whole notes. Its notes are compared as they are, with no window.

### 4. Paths: none, one operator, or two

- **Depth 1**, the default: the fragment itself and each of its variations under the options (`variations`, with the frontend's `keep` and `fewest`), all six operators unless the options name fewer.
- **Depth 2:** each variation's own variations as well. This costs a compile per variation when the recogniser warms (about 2 s over the library on E31's workbench) and nothing extra afterwards. It is an option because a homeostat that counts "a variation of something known" needs depth 1, and depth 2 is for asking how far a jam has wandered.
- **No inverse operators, and no meet-in-the-middle:** rotate has no inverse among the six, so a path is only ever read forwards, from the fragment towards the heard text.

### 5. Stateless, with a cache that changes no answer

The recogniser keeps each fragment's readings by its text and by the options it was read under, and each one's windows by the heard span, indexed by their notes for the exact match, the same way `createRepository` keeps compiles by text (`cachedFit`, #194). It stores nothing a frontend has to keep, and two recognisers give the same answer. The share of bars recognised, the run of bars it is counted over, and the ladder it moves are the frontend's (decision 048: the repository is stateless; decision 052, point 1: the policy is the frontend's).

### 6. Measured (`src/repository/recognise.test.ts`)

- **Jambot's 284 variations on E31's bars** (#216), recognised against the whole library (38 fragments, the General MIDI kits of #229 among them, which play no notes) on Jambot's workbench with `keep: ['&fill']` and `fewest: 3`. Each is recognised as its source's, by its own operator, at distance 0, and 282 of them come first.
  The other 2 come second, behind a fragment at distance 0 by no operator at all. Lo-fi hip hop's bar and Bossa nova's differ by one hat (and their levels), so Lo-fi hip hop with `drop &hat 4` plays Bossa nova's bar, and Bossa nova with `add &hat 4` plays Lo-fi hip hop's. The shorter path is the better answer here: the bar played is that seed.
- **The bass seeds' 24 variations** (#218) on their workbench over I–vi–IV–V, each recognised first as its source's, by its operator, at distance 0.
- **A pitched voice renamed:** the walking bass with every name changed (`&bass` → `&low`), and its variation renamed alike, are recognised as the seed's, by no operator and by its own, at distance 0.
- **A bar of a longer fragment:** the bossa nova clave's second bar alone is recognised as that clave from bar 1, and the fifth bar of the vamp to the seventh (`&harm over=key step=1m [6,8,10]`) as that vamp from bar 4, each the only fragment within tolerance 0.
- **The learned layer:** a groove the Muse filed (`fileFragment`) and the composer's `add` of it filed with `varies` and `by`, against the seed library merged with that layer. The variation's text is recognised as itself first and as the groove by the recorded `by`, both at distance 0, and the groove as itself.
- **1,000 seeded random bars of hits** (a kick, a snare and a hat line, each step struck with chance 1/4): none is recognised at tolerance 0. None is recognised at tolerance 2 or 4 either (a probe, not committed).
- **The cost**, on a recogniser warmed on the library (one recognition, about 150 ms): every recognition compiles only the heard text, one compile, counted. Over 1,000 random bars it took 1.1 ms at p50 and 2.5 ms at p95 at depth 1 and tolerance 0, 2.2 ms at p95 at tolerance 4, and 1.8 ms at p95 at depth 2 (warmed in about 2 s; the exact match is a lookup in each fragment's index). The bound is 5 ms at p95. Under the whole quick suite's load one run measured 5.1 ms, so the test gates on the compile count, as #194's does, with 25 ms as a gross witness, since #237 in the slow tier (`src/repository/timing.slow.test.ts`).

### 7. Settled with the owner (2026-10-21, on #230: all four as recommended)

1. **The distance as S2 over Vary's reading, not over compiled events?** Ruled, as recommended: yes, as above. Recognising over compiled events would reach every text the language compiles, but it would compile every variation in the library (284 on E31 alone, about 14 ms an S2 check, decision 052, point 5), which is far over the cost bound. The reach can grow with Vary's reader.
2. **Ties go to the shorter path** (Lo-fi hip hop's drop is Bossa nova's bar)? Ruled, as recommended: yes. The list still holds both, each by its own path, so a frontend that wants a lineage reads further down it.
3. **Depth 2 an option, depth 1 the default?** Ruled, as recommended: yes, for the cost in section 4.
4. **The tolerance in notes, the symmetric difference?** Ruled, as recommended: yes. It is the count the licence names, and a drop or an add is 1. A rotation counts as up to 2k because it moves k notes. Read as a path, it costs one operator.

## Why

- **The operators already enumerate the neighbourhood.** Decision 052's `variations` lists every fragment one operator away, S2-distinct and in one compile. Recognition is that list, read the other way and indexed by notes. No second model of what a variation is can drift from Vary's.
- **S2 is what "the same groove" means:** the same voice, onset, length and pitch, the levels free (decision 050). That is what a listener and the homeostat count as known.
- **Cheap enough to run on every bar.** One compile per recognition, and the library's readings are kept across calls, so the homeostat can sense each bar the Muse writes within Jambot's budget.

**Why not** a hash of each fragment and its variations (E4, #49): a hash finds an exact match only, and the tolerance needs a distance. The signature compared at tolerance 0 is that exact match already, over notes rather than text.
**Why not** recognition by style (`query` at the bar's style point): the style vector says where a bar is, not what it is. Two bars of one style can share no note.

## Consequences

- Jambot (yggi/jambot#237, rungs 1 and 6): the homeostat calls `recognise` on each bar the Muse writes, against the seed and its layer's filed fragments, and keeps the share recognised itself.
- `@yggi/cells/repository/recognise` (`createRecogniser`, `ALL_OPERATORS`, and in `index.ts`). `@yggi/cells/engine/vary/index` gains `readVariations`, `variations` with each variation's notes and its source's, the span and the bar they come round after, and a harmony's chords as notes. `variations` gives what it did.
- Vary's reader reads back its own pitched writes (`degree(…)`, `inverse(…)` around a splice), so a transposed or inverted bass varies again. No piece sounds different.
- `Recognised.bar` names where in a longer fragment a heard bar sits; a frontend counting the share recognised reads only whether the list is empty.
