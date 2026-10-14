/**
 * Time: when each clock steps. A clock's time map (`timeMap`: swing, positions in
 * a bar, a motor or a belt bending it), all of a program's clocks at a moment
 * (`clocking`), and what that does to shifts (`shiftsAt`: a table turns as its
 * step= chain steps). Nothing loops by itself: every stepped cell's shift is a
 * function of time.
 */
import type { CompileResult, Clock, Shifts } from './program';
import { type Warp } from './physics';
export declare const EPS = 1e-9;
export interface TimeMap {
    /** Entries (steps) per bar; 1 for a clock without positions. */
    readonly beats: number;
    /** A physical clock: how fast it runs at real second t (1 on tempo); absent for an ideal one. */
    speed?(t: number): number;
    /** Seconds at step s (fractional), relative to step 0. */
    q(step: number): number;
    /** Inverse of q for t ≥ 0. */
    stepAt(t: number): number;
}
/**
 * A clock steps `perSecond` times a second on average. If its entries are
 * positions in a bar (a lap of its grid), they place the steps: an agogic
 * bar keeps its length but bends where the beats fall. Fractional steps
 * interpolate.
 */
export declare function timeMap(result: CompileResult, clock: Clock, shifts: Shifts): TimeMap;
/**
 * Cells whose braid is played — the terms of every out (triggers and
 * modulators) and everything they splice: their moving shift is a playhead,
 * not a turn of a table.
 */
export declare function playedCells(result: CompileResult): Set<string>;
export interface Clocking {
    /** Fractional step count of a clock at `seconds`. */
    stepOf(clock: string): number;
    map(clock: string): TimeMap;
}
/**
 * The physics of a physical cell (a meter with a motor, or a belted cell): to put a hand on it, and
 * to read a belt's state. Null for a cell that turns ideally.
 */
export declare function physicsOf(result: CompileResult, statics: Shifts, cell: string): Warp | null;
/** varispeed= on a clock (the meter, or a belted cell): how fully pitch follows its speed (0 not at all). */
export declare function varispeedOf(result: CompileResult, clock: string): number;
/** A program's clocks read at `seconds`: each clock's time map, and how many steps it has taken. */
export declare function clocking(result: CompileResult, statics: Shifts, seconds?: number): Clocking;
/**
 * Shifts at a moment: the static shift, plus — for stepped cells that are
 * looked through rather than played — the turns their step= chain has made,
 * times their stride. They come round after the table's own length, or
 * where cycle= says (more laps climb on the way).
 */
export declare function shiftsAt(result: CompileResult, statics: Shifts, seconds: number, played?: ReadonlySet<string>): Shifts;
/** Is it a selector (a cell reading a table of taps: decision 016)? */
export declare function selects(result: CompileResult, name: string): boolean;
/**
 * A tape's motion: how far it has moved (tape-seconds) at real second x, when it has moved u, and how
 * fast it runs (1 on tempo). It runs at its clock's own time — a meter, a belt; none: real time.
 */
export declare function tapeMotion(result: CompileResult, clk: Clocking, tape: string): {
    pos: (x: number) => number;
    real: (u: number) => number;
    speed: (x: number) => number;
    moving: TimeMap | null;
};
