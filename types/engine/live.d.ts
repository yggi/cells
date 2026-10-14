/**
 * The live view: what plays at a moment, for drawing. Per cell, where its playhead is and which
 * table entries are looked up (the glyphs); per node and edge, what sounds now — the routing of
 * the outputs that play now (routing.ts), so it is always within what the graph draws as routed.
 * The gates are the scheduler's: an output plays until its end (laps=), and while every selector
 * it goes through picks it.
 */
import { type CompileResult, type Shifts } from './program';
interface LiveCell {
    /** Playhead inside the instance being played, in this cell's steps (braids). */
    local: number | null;
    /** Table entries being looked up right now. */
    entries: Set<number>;
}
export interface LiveState {
    readonly seconds: number;
    /** Shifts as they stand now (stepped tables turned). */
    readonly shifts: Shifts;
    /** Playheads and lit entries, per cell name. */
    readonly cells: ReadonlyMap<string, LiveCell>;
    /** What sounds now: node ids and (written) edge ids, within routing(). */
    readonly nodes: ReadonlySet<string>;
    readonly edges: ReadonlySet<string>;
    /** Voices played now (node ids). */
    readonly voices: ReadonlySet<string>;
    /** Bar count per clocked meter (0-based). */
    readonly bars: ReadonlyMap<string, number>;
    /** Where each clock is in its cycle, in beats (0 … beats, fractional): a meter's wheel turns by it. */
    readonly beatAt: ReadonlyMap<string, number>;
    /** How far each clock has come, in its steps (from the start): a cell it steps at a rate is that many times as far. */
    readonly stepAt: ReadonlyMap<string, number>;
    /** How far each clocked cell is through its current step, 0…1 (drives the pulses on edges). */
    readonly phases: ReadonlyMap<string, number>;
}
export declare function liveAt(result: CompileResult, statics: Shifts, muted: ReadonlySet<string>, seconds: number): LiveState;
export {};
