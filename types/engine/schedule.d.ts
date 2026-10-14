/**
 * What to play next: everything the sound needs for a window of the piece, as plain data — the notes that
 * start in it and, for sound tapes on a moving clock, their speed through it. Times are seconds at the
 * code's tempo; putting them on an audio clock is the player's business (audio/player.ts), and so is how
 * they sound (audio/voices.ts). Plain data on purpose: a window can be worked out anywhere — in this
 * thread, in a worker (audio/engine.worker.ts), offline (audio/render.ts) — and passed on by structured clone.
 */
import type { CompileResult } from './program';
import { type Held, type Plan, type Played } from './realize';
import { type ClockTicks } from './midiclock';
/** A sound tape's speed (1 on tempo) at moments through a window: its delays follow it. */
export interface TapeSpeed {
    readonly tape: string;
    readonly points: readonly {
        readonly at: number;
        readonly speed: number;
    }[];
}
export interface Window {
    readonly from: number;
    readonly to: number;
    /** The notes that start in [from, to), in order, each naming its output (which mixes' wheels hear it). */
    readonly events: readonly Played[];
    /** Tapes whose speed moves (a moving clock, dropouts, wandering heads): sampled every SPEED_STEP. */
    readonly tapes: readonly TapeSpeed[];
    /** The MIDI clock's ticks that fall in it, on the main meter (midiclock.ts); none without one. */
    readonly clock?: ClockTicks | null;
}
/**
 * Each moving tape's speed from `from` to `to` (inclusive), every SPEED_STEP seconds. Tapes that run
 * steadily — on real time, without dropouts or wandering heads — need none and are left out.
 */
export declare function tapeSpeeds(p: Plan, from: number, to: number): TapeSpeed[];
/**
 * The window [from, from + length): its notes, and its moving tapes' speeds (sampled a hair past the end,
 * so the last point of one window meets the first of the next). `held`: where the run of windows began (a drone's
 * note starts there: decision 028) and where its listener stops.
 */
export declare function windowAt(p: Plan, from: number, length: number, held?: Held): Window;
/**
 * Pieces with physical clocks (a motor, a belt): a hand on one should be heard quickly, so the player
 * schedules them closer to now.
 */
export declare function isPhysical(result: CompileResult): boolean;
/**
 * A window's times put onto another clock, linearly: code second x sounds at `time + (x − from) × scale`
 * (a note's start, its bends, levels and moving parameters, a tape's speed points), and lengths are
 * stretched by `scale`. The player's clock runs `scale` seconds per code second (the tempo control).
 */
export declare function retime(w: Window, time: number, scale: number): {
    events: Played[];
    tapes: TapeSpeed[];
    clock: ClockTicks | null;
};
