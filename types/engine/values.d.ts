/**
 * What a cell sounds at a moment, for the views (an oscilloscope, a wheel, an
 * envelope): its braid flattened once per program, shifts and cell, and read
 * where its clock says it is.
 */
import type { CompileResult, Shifts } from './program';
import { type Clocking } from './clocking';
/**
 * A cell's value at real second t (for an oscilloscope): the entry of its braid it's at, its clock
 * says — null in a rest; a map=lin cell glides from one entry to the next.
 */
export declare function valueAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): number | null;
/** Every value a cell sounds at real second t (a chord: all of it) — [] in a rest. */
export declare function valuesAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): number[];
/** Every note a cell sounds at real second t, with how long ago it began (seconds) — for envelopes. */
export declare function notesAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): {
    value: number;
    since: number;
}[];
/**
 * The note a cell sounds at real second t, or the last one it sounded before (its release may still be ringing): how
 * long ago it began and how long it is (seconds), or null if it sounds none. For an envelope drawn live.
 */
export declare function lastNoteAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): {
    since: number;
    length: number;
} | null;
