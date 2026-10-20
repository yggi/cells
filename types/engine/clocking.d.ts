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
 * modulators) and everything they splice: their own notes read their moving
 * shift as a playhead, not a turn of a table (`playing`).
 */
export declare function playedCells(result: CompileResult): ReadonlySet<string>;
/**
 * Cells a line reads through (#203): every over= (and the table a cell without one is shown through), every grid, and
 * every cell a relative pick reads (`&k[0]`, a fixed reader following it as it turns). A played cell turns in
 * `shiftsAt` only when it is one of these: its own notes read their shift as a playhead (`playing`).
 */
export declare function readThrough(result: CompileResult): ReadonlySet<string>;
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
 * Shifts at a moment, as a line reading through them sees them: the static shift, plus — for stepped cells a line
 * reads through (`readThrough`), played or not — the turns their step= chain has made, times their stride. A table that also plays turns
 * for what reads through it, so a reader sees the entry sounding (#167). A table turns by its braid's own steps (#122):
 * an entry held `@n` (or `_`) or repeated `!n` stays in force n steps, and a subsequence's steps turn within its step.
 * They come round after the braid's own length, or where cycle= says (more laps climb on the way). A played cell's own
 * notes read their own shift as it stands (`playing`), so a played cell nothing reads through doesn't turn (#203).
 */
export declare function shiftsAt(result: CompileResult, statics: Shifts, seconds: number): Shifts;
/**
 * Shifts as a played cell's own notes read them (#167): its moving shift is its playhead, the steps its braid has
 * played, so its own shift is the static one (a played grid's notes, a relative pick's entry as a mix plays it); every
 * table it reads through turns as `shiftsAt` turns it, played or not.
 */
export declare const playing: (now: Shifts, statics: Shifts, cell: string) => Shifts;
/** Where a turning table comes round by itself: its braid's own length in steps (a key of 12 after 12, `[0,2,4]@3 [5,7,9]` after 4). */
export declare const ownLength: (result: CompileResult, name: string) => number;
/** Is it a selector (a cell reading a table of sections: decision 016)? */
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
