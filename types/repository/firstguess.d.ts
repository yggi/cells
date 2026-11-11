import type { Resolve } from '../engine/program';
import { type PointReading } from '../engine/reading/point';
import type { Part } from '../engine/reading/style';
import type { Fragment, StylePoint } from './fragments';
/** The part a facet's fragment plays as, where it plays notes a reading can read. */
export declare const PART_OF: Readonly<Record<string, Part>>;
/** Bars a fragment is read over: sixteen, longer than the library's longest lap (`twelve_bar`'s twelve). */
export declare const READ_BARS = 16;
/**
 * The fragments a guess is taken from: the two whose readings are nearest. Over the library, leaving each fragment out,
 * a beat's `sync` is guessed best from the nearest one or two (k 1 to 5: 0.74, 0.77, 0.80, 0.87, 0.92 of the others'
 * mean's error) and a harmony's `harm` from three to five (0.58, 0.47, 0.41, 0.38, 0.41): two serves both.
 */
export declare const GUESS_K = 2;
/**
 * The axes a facet's notes carry, so a guess places them: a beat's `sync`, a harmony's `harm` (#681). Over the library,
 * each fragment guessed from the others (`firstguess.test.ts`), these are where the guess comes nearest its placement:
 * beats' `sync` 0.23 off, against 0.30 for the others' mean and 0.34 for the reading itself (30 beats in
 * 4/4); harmonies' `harm` 0.15, against 0.32 and 0.25 (17 harmonies). A bass line's and a motif's notes guess no axis better than the others' mean, since a part is
 * placed at its style's point and its notes say little of that style's other parts; so they guess none, and an axis
 * not guessed is left out (decision 037's D6).
 */
export declare const GUESSED: Readonly<Record<string, readonly string[]>>;
/**
 * What a fragment of a facet plays, read as its part: its reading, or null where it plays nothing a reading can read.
 * A fragment whose clock 4/4 doesn't meet (`fitsAs`'s `unmet`: a waltz's beat, an aksak's, a motif in 6/8) is not read:
 * the host plays it in 4/4, where its syncopation, which lies in its meter's uneven beats, reads as none.
 */
export declare function readFragment(text: string, facet: string, resolve: Resolve): PointReading | null;
/** The root mean square of the differences over the features two readings both have; Infinity over none. */
export declare function readingDistance(a: PointReading, b: PointReading): number;
/** A fragment's placed points as the facet: the points it is associated at as that facet (or as every facet). */
export declare const placedAs: (f: Fragment, facet: string) => StylePoint[];
/** A read fragment of the library: its id, its reading and its placed points. */
export interface Read {
    readonly id: string;
    readonly reading: PointReading;
    readonly placed: readonly StylePoint[];
}
/** The fragments of a facet the library holds, each read (those that play nothing a reading can read left out). */
export declare function readFacet(library: readonly Fragment[], facet: string, resolve: Resolve): Read[];
/** A guess: the point, and the fragments it was taken from, nearest first, each its reading's distance. */
export interface Guess {
    readonly point: StylePoint;
    readonly from: readonly {
        readonly id: string;
        readonly distance: number;
    }[];
}
/**
 * The first guess at a reading's place among read fragments: the mean of the placed points (each fragment's own mean,
 * where it is placed at several) of the `k` whose readings are nearest. Null where none can be compared.
 */
export declare function firstGuess(reading: PointReading, among: readonly Read[], k?: number): Guess | null;
/** A fragment's first guess at its place as a facet: the axes its notes carry (`GUESSED`), from the library's fragments of that facet. Null where it guesses none. */
export declare function guessPlace(text: string, facet: string, library: readonly Fragment[], resolve: Resolve): Guess | null;
