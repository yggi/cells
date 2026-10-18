import { type CompileResult } from './program';
import type { FreeSpec } from './ast';
export interface PieceTime {
    /** It ends: after this many seconds (laps=). */
    readonly ends: number | null;
    /** It loops: every layer back together after this many seconds (Infinity: astronomically long). */
    readonly cycle: number | null;
    /** Chance plays a part: no two times round are the same. */
    readonly chance: boolean;
    /** The longest single layer's period, in seconds (null: nothing repeats). */
    readonly longest: number | null;
}
/** The span to move around in: the whole piece if it ends; its cycle, if that's half an hour at most; else its longest layer. */
export declare function mainLength(t: PieceTime): number | null;
export declare function pieceTime(result: CompileResult, seen?: number[]): PieceTime;
/** A time on a clock face, as the transport shows it: m:ss, or h:mm:ss with `hours` (seconds rounded down). */
export declare function clockText(seconds: number, hours?: boolean): string;
/** A duration in words: 0:13, 5:20, 3 h 12 min, 4 days, 2,300 years, 10^14 years. */
export declare function durationText(seconds: number): string;
/**
 * The piece's sections, if an arrangement plays it (a selector: a cell reading a table of sections, `selects`):
 * where each begins (seconds, within one lap) and what it's called — from the selector's label,
 * split at ·, when the names match the sections; else numbered.
 */
export declare function sections(result: CompileResult): {
    at: number;
    label: string;
}[] | null;
/** The meter that drives the piece, and its free() tempo if it has one (the transport's tempo slider). */
export declare function mainTempo(result: CompileResult): {
    cell: string;
    free: FreeSpec;
} | null;
/** A piece anchored to the clock (anchor=11.55, hours.minutes): where the day stands in it at `now`, in seconds; null without an anchor. */
export declare function anchoredAt(result: CompileResult, now: Date): number | null;
