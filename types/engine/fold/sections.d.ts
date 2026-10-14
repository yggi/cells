/**
 * Sections (#346, docs/notes/fold.md): a piece cut where its key changes, each part of a line a cell of its own read
 * through its section's key, the line splicing its parts in order. A fugue's exposition, its episodes, its returns: in
 * degrees of each section's key, an entry in the dominant is the same degrees as the one in the tonic, so the folder
 * finds it one phrase; and the piece reads as its sections. Pure.
 *
 * - **Key areas** (`keyAreas`): a bar a time, the accidentals its notes would need in each of the 36 collections (the
 *   twelve major scales, their relative minors with them, and the twelve harmonic and twelve melodic minors); the keys bar by bar that
 *   need fewest, a change of key costing `SWITCH` (a Viterbi path), so a key is taken where it lasts, not for a chord.
 *   Each area is named in its collection: a harmonic or melodic minor as itself; a major scale's notes as its major or its relative
 *   minor, whichever tonic the bass starts or ends the area on.
 * - **Cuts** (`cutLines`): each line is cut at each area's start, or, where a note is held across it, at the nearest
 *   step within a bar where none is.
 */
import { type Key } from './degrees';
import type { Line } from './ir';
/** A section: from one step to another (the piece's), and its key. */
export interface Section {
    readonly from: number;
    readonly to: number;
    readonly key: Key;
}
/** The piece's key areas, a bar `bar` steps long: one section a key, from the first step to the last. */
export declare function keyAreas(lines: readonly Line[], bar: number): Section[];
/** A line cut into its sections' parts: each from where the line's section starts (no note held across it) to the
 * next, its chords from 0. */
export declare function cutLines(lines: readonly Line[], sections: readonly Section[], bar: number): {
    line: string;
    section: number;
    part: Line;
}[];
