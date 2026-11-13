import type { CompileResult } from './program';
/** One part of a piece: a `from` line's take, a fragment line inside one, or a line the piece writes itself. */
export interface OutlinePart {
    /** Unique in the outline: the piece's line (`'4'`), or the piece's line and the fragment's line inside it (`'8/3'`). */
    readonly key: string;
    /** The piece's line it is on (1-based). */
    readonly line: number;
    /** The fragment it is taken from (`funk_bass`, `bass_performer`), or null for a line the piece writes itself. */
    readonly id: string | null;
    /** The part it is inside (a take's key), or null for a line of the piece. */
    readonly within: string | null;
    /** Its names as the piece reads them (`&bassline`): a take's heads, less the copies' private cells (`&bar_tempo`). */
    readonly heads: readonly string[];
    /** Every cell it holds, by its name as compiled. */
    readonly cells: readonly string[];
    /** The fragment's facets (`facetsOf`), or none. */
    readonly facets: readonly string[];
    /** A take's arguments as written (`{ harm: '&harm' }`), or none. */
    readonly args: Readonly<Record<string, string>> | null;
    /** The names a take asks for that the piece's own lines define instead: taken, with the piece's own changes. */
    readonly overrode: readonly string[];
    /** The parts it reads, by key, in the piece's order. */
    readonly reads: readonly string[];
    /** The parts whose voices it splices (`&beat &bd ~ &hh` plays on the kit), by key: what it plays on, in neither tree. */
    readonly on: readonly string[];
}
/** A part and the parts nested under it. */
export interface OutlineNode {
    readonly part: OutlinePart;
    readonly children: readonly OutlineNode[];
}
export interface Outline {
    /** Every part, in the piece's order (a take's inner parts after it). */
    readonly parts: readonly OutlinePart[];
    /** From the ground: the roots read no part; each part under a part it reads, the one its arguments name first. */
    readonly ground: readonly OutlineNode[];
    /** From the outputs: the roots are read by no part; each part under a part that reads it. */
    readonly outputs: readonly OutlineNode[];
}
export interface OutlineOptions {
    /** A fragment's facets by its id (a frontend's catalogue, `repository/catalogue`); none by default. */
    readonly facetsOf?: (id: string) => readonly string[];
}
/** The outline of a compiled piece (see the module's comment). */
export declare function outlineOf(result: CompileResult, { facetsOf }?: OutlineOptions): Outline;
