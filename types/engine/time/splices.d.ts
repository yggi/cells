import { type Plan } from '../realize';
/** A splice boundary: when, the cell that begins there and the one before it, and the output it is in. */
export interface Splice {
    readonly at: number;
    readonly cell: string;
    readonly after: string;
    readonly output: string;
}
/**
 * Every splice boundary from 0 to `until` seconds where its output then plays a note within the boundary's step (a
 * part a selector keeps silent there has none you could hear), one a moment (to the millisecond) and output.
 */
export declare function splices(p: Plan, until: number): Splice[];
