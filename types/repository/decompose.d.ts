import type { Fragment } from './fragments';
/** A note of a line: where it starts in whole notes from the line's start, its degree and its accidental. */
export interface LineNote {
    readonly at: number;
    readonly degree: number;
    readonly alter: number;
}
/** A line written as a form and its motifs, or as it was. */
export interface Decomposition {
    /** The text, open on its meter and its key (no `&bar`, no `&key`): the line's cell, and every line it takes. */
    readonly text: string;
    /** The form's id, or null where the line stays a line. */
    readonly form: string | null;
    /** The call's seed motif id, or null where it is a line of its own (or the line stays a line). */
    readonly call: string | null;
    /** Each helper set, by its name, to a seed motif's id or to null where it is a line of its own. */
    readonly helpers: Readonly<Record<string, string | null>>;
    /** The structure it is written with (`structureOf`'s total). */
    readonly structure: number;
}
/** What a decomposition is tried with: the forms and the motifs, the seed's unless given. */
export interface DecomposeOptions {
    readonly forms?: readonly Fragment[];
    readonly motifs?: readonly Fragment[];
}
/**
 * A cell's notes written out as a line of eighths over the key, `cell` its name, as the Muse files what she heard: each
 * note held to the next, its lap the cell's. Null where the text doesn't compile on `meter`'s bench, the cell plays
 * other than degrees of the key, or a note falls between the eighths.
 */
export declare function writtenOut(text: string, cell: string, meter: string, as?: string): string | null;
/**
 * A line of several bars written as the form and the motifs that play it, or as it was: `line` is a text whose cell
 * `cell` plays degrees of the key (`over=&key`), read on `meter` (a signature, `4/4`).
 */
export declare function decompose(line: string, cell: string, meter: string, options?: DecomposeOptions): Decomposition;
