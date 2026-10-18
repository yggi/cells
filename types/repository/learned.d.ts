/**
 * The learned layer, changed (decision 048; decision 043, points 1–2; decision 047, point 7): what a jam learns is the
 * frontend's, plain data it keeps and hands to each query (`LearnedLayer`, `fragments.ts`). Every function here takes a
 * layer and returns a new one, never changing the one it was given, so cells keeps no state between calls.
 *
 * - **Filing** (`fileFragment`): a fragment the composer made on a miss, or the Muse heard, gets an association of one
 *   point, at the query's point, of weight `FILING_WEIGHT`, with `source` and `created` set: a `FragmentFile`, which
 *   `writeFragment` writes as a file.
 * - **Identity, until the hash** (#46, #28): a filed text that is a held fragment's text after renaming (`sameText`: the
 *   two read alike once each one's own names are numbered in the order it declares them) adds to that fragment, as a
 *   use of it at the filing's point, instead of becoming a second.
 * - **Use** (`useFragments`): the fragments a frontend kept together have each pair's count raised by one (decision 046),
 *   and each moves its association at the point it was kept: the point that finds it there (its least distance over
 *   weight, of the facet kept) is raised by `USE_STEP`, to `USE_CAP` at most. A seed point is cells' and stays as written:
 *   the layer raises it by a point of its own at the same place, which the merge then finds first. A fragment with no
 *   point of that facet gets one at the use's place, of weight `FILING_WEIGHT`. So use never adds a place a fragment is
 *   found at (a point added where it was kept would drag it along a walking style, one section behind, and lock the
 *   composer onto it: in each of 8 runs of 1,250 sections, its 3 most used meters and rhythms held every section, against
 *   76 to 100 % with nothing learned, in the lock-in measure's first draft, `lockin.ts`); it makes the places it has
 *   reach farther, by a fifth at most.
 */
import type { FragmentFile, Meta } from './files';
import { type LearnedLayer, type Repository, type StylePoint } from './fragments';
/**
 * A filed fragment's weight at its point. A fragment is first at a query when its distance divided by its weight is the
 * least, so at 0.1 a filed fragment is first only within a tenth of its nearest rival's distance: where the composer
 * files, on a miss, nothing lies within 0.3 (Jambot's `MISS_DISTANCE`), so what it made holds the next 0.03 around its
 * point (two sections of the radio's walk at entropy 0.3, 0.014 a section), and use takes it farther; where a seed
 * fragment sits 0.05 away, a fragment the Muse filed is first only within 0.005 of where it was heard.
 */
export declare const FILING_WEIGHT = 0.1;
/** What a use adds to the weight of the point that found the fragment: a filing's weight, so a filed fragment kept at ten sections is as strong as a seed point. */
export declare const USE_STEP = 0.1;
/**
 * The most use can raise a point's weight to. A seed point weighs 1, so use shortens a seed fragment's distances by a
 * sixth at most (1/1.2), and moves its border with a fragment nothing used from halfway to six elevenths of the way: a
 * fragment more than 1.2 times as far as one used is never found first. Over the lock-in measure's 256 runs of 1,250
 * sections at entropy 0.3 (`lockin.ts`, `lockin.slow.test.ts`), use moves add 1.5 points to the share of sections whose
 * fragment is among its run's 3 most used (meters) and 2.5 (rhythms), and 4.05 to the rhythms' with use together, each
 * under the bound of 5 with twice its standard error (0.2 to 0.4 points); at 1.25 they add 2.2 and 3.9, and 6.1 with
 * use together at 046's first reach (#162); at 1.5, 4.9 and 7.2; at 1.1, −0.4 and 0.4. The step barely matters (0.02,
 * 0.05 or 0.1, within half a point): the cap decides.
 */
export declare const USE_CAP = 1.2;
/** A fragment to file: its text, where it was made or heard, and who and when. */
export interface Filing {
    readonly text: string;
    /** The query's point: where the composer missed, or where the Muse heard it. */
    readonly point: StylePoint;
    /** The facet it was made as (`meter`, `rhythm`), a hint on its point; none for every facet. */
    readonly facet?: string;
    /** Who filed it: `composer`, `muse`, a person's name. */
    readonly source: string;
    /** When, as the frontend writes a timestamp (cells has no clock): `2026-10-18T21:04:00Z`. */
    readonly created: string;
    /** Its id; by default `<source> <created>`, then ` 2`, ` 3` … while that is taken. A given id that is taken is an error. */
    readonly id?: string;
    /** More metadata (`tags`, `heard`, anything): kept after `source` and `created`. */
    readonly meta?: Meta;
    readonly prose?: string;
}
/** What filing did: the new layer, and the fragment the text is now held as. */
export interface Filed {
    readonly layer: LearnedLayer;
    /** The id it is held under: the new fragment's, or the held fragment's whose text it is. */
    readonly id: string;
    /** The file filed, as `writeFragment` writes it; null when the text was held already and the filing added to it. */
    readonly file: FragmentFile | null;
    /** Where it was held: its own names to the held fragment's (`&bd` → `&kick`), those that differ. Empty for a new one. */
    readonly renamed: ReadonlyMap<string, string>;
}
/** A fragment kept: its id, and where it was kept (the query's point and facet). A use with no point counts toward use together and moves nothing. */
export interface Use {
    readonly id: string;
    readonly point?: StylePoint;
    readonly facet?: string;
}
/**
 * A text as identity reads it, until the hash: each declaration's code as the union reads it (`fit.ts`: comments aside,
 * whitespace collapsed, a line and those it continues onto as one), its own names numbered in the order it declares
 * them (`&#1`, `&#2`, no name a text can write), the interface names and the names it uses but doesn't define as
 * written. Two texts that read alike are one fragment, renamed.
 */
export declare function canonicalText(text: string): string;
/** Whether text `a` is text `b` after renaming: then its own names to `b`'s, those that differ (`&bd` → `&kick`); else null. */
export declare function sameText(a: string, b: string): ReadonlyMap<string, string> | null;
/** How often two fragments were used together, in a layer (0 for a fragment with itself). */
export declare function usedTogether(layer: LearnedLayer, a: string, b: string): number;
/**
 * What using these fragments together teaches (see the module's comment): each pair's count raised by one, and each use
 * that names its point moving its fragment's association there. Throws on an id neither the seed nor the layer holds,
 * and returns a new layer, the one given unchanged.
 */
export declare function useFragments(repository: Repository, layer: LearnedLayer, uses: readonly Use[]): LearnedLayer;
/**
 * A fragment filed (see the module's comment): a new fragment of one point at the filing's point, weight
 * `FILING_WEIGHT`, its metadata `source`, `created` and the rest; or, where its text is a held fragment's after renaming,
 * a use of that fragment at the point. Throws on a filing that isn't one (no text, no source or created, a malformed
 * point, a taken id, metadata that names what the file writes itself).
 */
export declare function fileFragment(repository: Repository, layer: LearnedLayer, filing: Filing): Filed;
