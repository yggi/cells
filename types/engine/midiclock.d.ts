import type { CompileResult } from './program';
import type { Plan } from './realize';
/** Ticks a beat (MIDI's 24 ppqn). */
export declare const PPQN = 24;
/** The meter the ticks follow: its cell (its clock) and how many of its steps make a beat. */
export interface MainMeter {
    readonly cell: string;
    readonly beat: number;
}
/** A window's ticks: the index of the first (from the piece's start), their times, and the time of the tick before it. */
export interface ClockTicks {
    readonly first: number;
    readonly at: readonly number[];
    /** When tick `first − 1` falls on the same grid (−Infinity before the first): how far apart the ticks are where the window starts. */
    readonly before: number;
}
/**
 * The piece's main meter: the clock of its first played cell, followed up the step= chain to its root, the clock with a
 * rate of its own, or the meter a rate alone steps (`step=&tempo`). It is a meter if it places steps in a bar (a scan, `meter(…)`), says what a beat is (`beat=`,
 * `swing=`), or other cells step with it; a lone cell stepping at a rate (`&tune step=4 0 2 4`) is not, and a piece
 * without one sends no clock.
 */
export declare function mainMeter(result: CompileResult): MainMeter | null;
/**
 * The ticks that fall in [from, to) (code seconds), on the plan's main meter: none without one, none past the plan's end
 * (`laps=`, a clock run down), none where the meter has stopped.
 */
export declare function ticksBetween(p: Plan, from: number, to: number): ClockTicks | null;
