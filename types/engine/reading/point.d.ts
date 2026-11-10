import { type ReadMode } from './mood';
import { type Bar, type Sounding } from './style';
/** The axes a reading places. */
export type ReadAxis = 'sync' | 'harm' | 'bite' | 'mood';
/** What a span of bars reads as. */
export interface PointReading {
    /** The axes the notes could speak to, each its mean over the bars that read it. */
    readonly point: Partial<Record<ReadAxis, number>>;
    /** How far to trust each axis of `point`, 0 to 1. */
    readonly confidence: Partial<Record<ReadAxis, number>>;
    /** Onsets per step, the span's mean: how hard it plays (#571), not a place. */
    readonly intensity: number;
    /** The mode and tonic `mood` was read from, where one was. */
    readonly mode?: {
        readonly mode: ReadMode;
        readonly tonic: number;
    };
}
/** Onsets per step at which `sync` is fully heard: one each step. */
export declare const SYNC_FULL = 1;
/** Notes of the bass and the lead in a bar at which `bite` is fully heard. */
export declare const BITE_FULL = 4;
/** A span of bars, each its notes with steps from the bar's start, read as a point and how far to trust it. */
export declare function readPoint(bars: readonly (readonly Sounding[])[], bar?: Bar): PointReading;
