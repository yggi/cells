/**
 * Recording a braid left free (`free(0 2 4 ~ …)`, #210, decision 018), the pure part: a key as the number the cell
 * writes for it (`tableReader`: its table's nearest entry, or an accidental on the grid below), one pass of keys taken
 * against the cell's own steps (`Take`), and the quantiser that writes them as braid tokens (`quantise`): keys held
 * together a chord `[a,b]`, a key held across steps `@n`, nothing `~`. Positions are kept exact (steps through the
 * cell's time map, so swing and moving clocks are undone) and rounded only when the take is written. The law:
 * recording what a braid plays gives the braid back (capture.test.ts).
 */
import type { FreeSpec } from './ast';
import type { CompileResult, Output, Shifts } from './program';
/** What a key outside the cell's table does, live and recorded: an accidental (as played), the nearest entry, or nothing. */
export type OutOfTable = 'allow' | 'snap' | 'ignore';
/** A number as a braid writes it: an entry of the table (laps beyond climbing), and accidentals (# up, b down a grid step). */
export interface Written {
    readonly value: number;
    readonly alter: number;
}
/** A step's text: `4`, `6#`, `3bb`, `-1`. */
export declare const writtenText: (w: Written) => string;
/** The out that plays a cell's own braid as notes on a voice (not a kit, a gate, a tape), or null. */
export declare function melodicOut(result: CompileResult, cell: string): Output | null;
/** A cell a take records into: its braid left free, and the out that plays it. */
export interface RecordTarget {
    readonly cell: string;
    readonly spec: FreeSpec;
    readonly out: Output;
}
/**
 * Where a take goes (the cell armed for the keys, #207): the cell armed, if its braid is left free, it steps on a clock and it plays notes;
 * a voice armed, the first such cell (in reading order) that plays it. Null: nothing to record into.
 */
export declare function recordTarget(result: CompileResult, armed: string | null): RecordTarget | null;
/**
 * The numbers a melody can write, as pitches on its out (semitones from its voice's own pitch, as a played note is:
 * the cell's tables down to its grid's tuning, the out's sign and constant semitones). `read(semis)` gives the nearest:
 * under 'snap' the nearest entry; under 'allow' the nearest pitch of the grid below, written as an entry with
 * accidentals (fewest, sharps before flats); under 'ignore' that pitch only if it is an entry, else null.
 */
export declare function tableReader(result: CompileResult, o: Output, shifts: Shifts): {
    read(semis: number, mode: OutOfTable): (Written & {
        readonly semis: number;
    }) | null;
};
/** A key captured in a take: what it writes, and when it went down and up, in the cell's steps from the pass's start (exact). */
export interface Captured extends Written {
    readonly on: number;
    readonly off: number;
}
/**
 * Captured keys as braid tokens over a frame of `length` steps. A key starts on its nearest step (half a step rounds
 * later) and lasts to its nearest step (one at least), but no further than the next step a key starts on: keys starting
 * together are a chord (sorted, each once) as long as the longest, a step held over several `@n`, a step nothing covers
 * `~`. Keys starting outside the frame are dropped.
 */
export declare function quantise(notes: readonly Captured[], length: number): string[];
/**
 * One take: a pass of a cell's loop (`length` steps), its keys as they go down and up, at exact steps of the cell's
 * clock. `begin` places the pass: the first whole loop from where the cell is (a pass just begun, within half a step,
 * counts). Keys may come before it is placed; what falls outside it is dropped when it is written.
 */
export declare class Take {
    #private;
    readonly length: number;
    /** Where the pass starts, in the cell's steps, once placed. */
    start: number | null;
    constructor(length: number);
    /** Place the pass from the cell's step now (once). */
    begin(step: number): void;
    /** The step at which the pass is over (the last a key may start on), once placed. */
    get end(): number | null;
    /** A key down at a step (`key` names it, for its up): what it writes, or null (a key that writes nothing). Down again: a new note. */
    down(key: string, w: Written | null, step: number): void;
    /** A key up at a step. */
    up(key: string, step: number): void;
    /** The take as braid tokens: keys still down end with the pass. Null: never placed. */
    write(): string[] | null;
}
