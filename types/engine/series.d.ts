import { type StepEvent } from './flatten';
import type { Plan } from './realize';
export interface Series {
    readonly sign: 1 | -1;
    /** map=lin: values ramp from step to step instead of holding. */
    readonly lin: boolean;
    /** map=db: values are decibels (0 full, −6 about half). */
    readonly db: boolean;
    /** null: a static term (no clock) — it holds its first value. */
    readonly clock: string | null;
    readonly rate: number;
    /** The cell's length in its own steps. */
    readonly period: number;
    readonly events: readonly StepEvent[];
}
export interface VoiceParam {
    readonly range: readonly [number, number] | null;
    readonly series: readonly Series[];
    readonly env: {
        readonly attack: number;
        readonly decay: number;
        readonly sustain: number;
        readonly release: number;
    } | null;
}
/**
 * A parameter over one note: points (held, or ramp: glide there), or an
 * envelope from `from` up to `peak` and down to its sustain, released after the note.
 */
export type ParamTrack = {
    readonly kind: 'points';
    readonly points: readonly {
        readonly at: number;
        readonly value: number;
        readonly ramp?: boolean;
    }[];
} | {
    readonly kind: 'env';
    readonly from: number;
    readonly peak: number;
    readonly attack: number;
    readonly decay: number;
    readonly sustain: number;
    readonly release: number;
};
/** A voice's moving parameters over one note [at, at + dur). */
export declare function paramTracks(p: Plan, voice: string, at: number, dur: number): Record<string, ParamTrack> | undefined;
/** Pitch of a step event, in semitones, looking tables up as they stand at `at`. */
export declare function pitchOf(p: Plan, e: StepEvent, at: number): number;
/**
 * A modulating term over [from, to): its value at `from`, then each change
 * (hold between steps). Rests hold the previous value; a static term holds
 * its first.
 */
export declare function modulation(p: Plan, m: Series, from: number, to: number): {
    at: number;
    semis: number;
    ramp?: boolean;
}[];
/**
 * A held series' step in force at a time (a kit read under the term that starts notes: the number that picks the
 * member, decision 029); a static one holds its first.
 */
export declare function heldAt(p: Plan, m: Series, at: number): StepEvent | null;
/**
 * A volume stream over [from, to): its level at `from`, then each change.
 * Levels are the values as written (map=amp: 1 full, 0 silent); a rest is
 * silence; a stream that doesn't move holds its first value.
 */
export declare function levelSeries(p: Plan, m: Series, from: number, to: number, written?: number): {
    at: number;
    level: number;
    ramp?: boolean;
}[];
/**
 * A series' value at a time: held series hold their last point; ramped ones
 * (any point with ramp) are interpolated between the points around it.
 */
export declare function valueThen<T extends {
    at: number;
    ramp?: boolean;
}>(s: readonly T[], time: number, v: (x: T) => number): number;
