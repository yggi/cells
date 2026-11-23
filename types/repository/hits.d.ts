import type { DrumRole } from '../engine/perform/feel';
import type { Resolve } from '../engine/program';
/** A hit of a line: the line it comes from, the role the line declares (null where it declares none), its key, its step and its velocity. */
export interface Hit {
    readonly line: string;
    readonly role: DrumRole | null;
    readonly note: number;
    /** The step in `1/grid` notes from the bar's start (sixteenths by default), whole where the hit falls on one (within a millionth), else the fraction. */
    readonly step: number;
    readonly velocity: number;
}
/** A line of the groove and the role it declares. */
export interface HitLine {
    readonly name: string;
    readonly role: DrumRole | null;
}
/** A groove read: the bars of its lap (`cycle=` of its longest line, at least one), each of its lines, and its hits by step then key. */
export interface HitsRead {
    readonly bars: number;
    readonly lines: readonly HitLine[];
    readonly hits: readonly Hit[];
}
/** How `hitsOf` reads: the library's resolve for the fragment's `from` lines, and the grid a step is on. */
export interface HitsOptions {
    readonly resolve: Resolve;
    /** Steps a whole note: a hit's `step` counts 1/`grid` notes from the bar's start (16: sixteenths, 4/4 has 16, 6/8 has 12). */
    readonly grid?: number;
}
/**
 * A rhythm fragment's hits on a bench (a text with a meter and its tempo: `&bar meter("4/4") step=120bpm`), its `from` lines
 * read through `resolve`; null where it has no mix of lines (a `[ ... ]` cell), or the bench no meter to step on. A line
 * that declares no `role=` is listed with a null role, and its hits carry none: no role is guessed.
 */
export declare function hitsOf(fragment: string, bench: string, { resolve, grid }: HitsOptions): HitsRead | null;
