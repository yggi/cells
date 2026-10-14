/**
 * Physical clocks: a meter with a motor (motor=) is a body that turns — it has mass
 * (mass=), feels drag (friction=), and carries what it drives (their mass= and
 * friction=) as load. Its motor pulls towards the tempo with a torque that falls to
 * nothing at full speed (a real motor's curve); a spring that winds down (wind=
 * seconds) holds its pull, then gives out — 1 − (t/wind)⁴ — and the clock coasts to a stop.
 *
 * It doesn't replace the clock's time map — it warps it. Nominal time (where the
 * clock would be, ideal) runs at v per real second:
 *     M · dv/dt = motor · (1 − v) · spring(t) − F · v,       v(0) = 0 (from rest)
 * so a step due at nominal second s sounds when the clock has come that far.
 * Deterministic: fixed steps of 2 ms, the same every time.
 */
import type { CompileResult } from './program';
export interface Warp {
    /** Nominal seconds covered at real second t. */
    nominal(t: number): number;
    /** The real second at which nominal second s is reached (Infinity: never — it has stopped). */
    real(s: number): number;
    /** When it comes to rest (wind= run down), in real seconds — null if it never does. */
    stopsAt(): number | null;
    /** How fast it runs at real second t (1: on tempo). */
    speed(t: number): number;
    /**
     * A hand on it, from real second t: it's pulled hard towards the finger's speed (nominal units:
     * 1 = on tempo, 0 = held still, −1 = backwards) — null lets go. What's worked out past t is
     * thrown away and worked out again. Live only: nothing is kept with the piece.
     */
    grab(t: number, speed: number | null): void;
    /** Forget everything past real second t (something it's driven by changed there). */
    cut(t: number): void;
    /** A belt's state at t: how far it's stretched (driver ahead: +), and whether it's slipping. */
    state?(t: number): {
        stretch: number;
        slipping: boolean;
    };
}
/** A hand on a physical clock (its cell's name), from real second t; null lets go. */
export declare function grab(result: CompileResult, w: Warp, t: number, speed: number | null): void;
/** Back to how it was written: every hand forgotten (each play starts clean — the hand doesn't count). */
export declare function resetPhysics(result: CompileResult): void;
/** (realize keeps its belts: it registers how to forget them) */
export declare const onReset: (f: (r: CompileResult) => void) => number;
/** The physics of a clock cell, if it has a motor (else null: ideal, as it always was). Once per program. */
export declare function warpOf(result: CompileResult, clock: string): Warp | null;
/**
 * A belt: the driven cell is a body (mass=) pulled towards where its driver would put it (x, in the
 * driver's nominal seconds) by a spring (belt=, its stiffness) with damping (damping=). Past its grip
 * (slip=) the belt slips: the pull can't grow, and the cell falls behind for good. It may swing back,
 * but its time never runs backwards: where it would, it holds.
 */
export declare function beltWarp(result: CompileResult | null, k: number, m: number, c: number, slip: number, x: (t: number) => number): Warp;
