/**
 * A cell's braid as numbers in its own steps: references spliced in, picks and
 * shifts applied (`flatten`). What every reading of a braid starts from — the
 * plan, the live view, labels, Shorten.
 */
import { type Pick } from './ast';
import { type CompileResult, type Shifts } from './program';
import { type Chosen, type Laps } from './subseq';
/**
 * A cell's units as played: rotated by its shift (plus a [<<]/[>>] shift); a pick takes from them as they are turned
 * (wrapped entries climbing a lap), or as written (`$`).
 */
export declare function unitsFor(result: CompileResult, name: string, shifts: Shifts, pick: Pick | null, table?: string, extra?: number): import("./program").Unit[];
/** Steps taken by a (picked) cell. */
export declare const stepsOf: (result: CompileResult, name: string, pick: Pick | null) => number;
export interface StepEvent {
    readonly step: number;
    readonly duration: number;
    readonly value: number;
    readonly alter: number;
    /** Cell the number was written in. */
    readonly cell: string;
    /** Table it indexes (the cell's over=, else its player's), with that reference's shift. */
    readonly table: string;
    readonly tableShift: number;
    /** Grid steps it's transposed by (the ^$n of every reference it was spliced through). */
    readonly transpose?: number;
    /**
     * A relative pick, a fixed reader: the value is entry `index` of `cell` turned as it stands when it sounds (read in `ctx`,
     * for its lap), times mul plus add (degree(…), inverse(…)); `value` is that entry as the code has it.
     */
    readonly via?: {
        readonly cell: string;
        readonly index: number;
        readonly ctx: string;
        readonly mul: 1 | -1;
        readonly add: number;
    };
    /** x?p: the probability it is dropped (each time round, reproducibly). */
    readonly chance?: number;
    /** &x:0:g: its gain, times every level it was spliced at. */
    readonly level?: number;
    /** [a|b|c]: what it chooses from (value is the first, for drawing). */
    readonly options?: readonly {
        readonly value: number;
        readonly alter: number;
    }[];
    /** `<a b>`, `x/n`: it plays on the laps (of the cell played) where lap mod `of` is `is`; absent, on every lap. */
    readonly laps?: Laps;
    /** `[a b|c]`: the choices it is in; it plays when each draws its option (realize.ts `thrown`). */
    readonly chosen?: readonly Chosen[];
}
export declare class ExpansionLimit extends Error {
}
/**
 * All numbers a cell plays, in its own steps, with &refs spliced in.
 * `&x+n` splices x shifted by n. A spliced cell without over= reads its
 * numbers through the table of whoever splices it.
 */
export declare function flatten(result: CompileResult, root: string, shifts: Shifts, rootPick?: Pick | null, silent?: (name: string) => boolean, rootShift?: number, rootCtx?: string): StepEvent[];
/** A step event's value and accidental: a relative pick's entry as its cell stands now (StepEvent.via), else as written. */
export declare function tapped(result: CompileResult, e: StepEvent, shifts: Shifts): {
    value: number;
    alter: number;
};
