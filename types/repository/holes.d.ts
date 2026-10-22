/**
 * A fragment's holes (decision 047, point 1): what its text uses and doesn't define, what it defines, and what its clock
 * needs, all read off the compiler's own results, never written beside the text and never parsed a second time.
 *
 * - **Defines:** the cells its lines declare (the parser's declarations; an unnamed cell `&( … )` is part of its line).
 * - **Uses:** each name its compile reports as unknown (`CompileResult.unknown`: the compiler's one place for a name
 *   used and declared nowhere), and `key` when a line reads the main key (`over=key`, #130) and the text has none of its
 *   own. A name the compiler doesn't reach, for an earlier error on the same line, isn't listed; the fit's compile of the
 *   union still says it (`fit.ts`).
 * - **Clock needs:** each line that taps a meter it doesn't define (`step=16n`, the main meter; `step=&m:16n`) needs its
 *   lap to hold its braid a whole number of times, so that it comes round at the lap's end and not before or after: the
 *   taps of its level in its `cycle=` bars, times its rate (`16n*2`: 2), a multiple of its steps. Stated as the smallest
 *   bar that does: a braid of 32 sixteenths on `cycle=2` needs bars of 16 sixteenths (or 32, 48 …), so a two-bar clave
 *   compiles under 7/8 (bars of 14) but doesn't fit it; a line of one step on `1m` needs bars of 1, any meter.
 * - **Sounds:** the uses read only as a sound, a step of a braid or a term of a mix (a groove's `&bd`), never as a table,
 *   a clock or a parameter: decision 054 rules that such a hole doesn't block the fit (the composer asks for the
 *   instrument next).
 * - A text with `use` lines (decision 054) is read over its expansion, given the resolver its compile reads them by
 *   (`resolve`): a used fragment's holes, sounds and clock needs are the text's, less what the text and the other used
 *   fragments define, and it defines what they give (`CompileResult.uses`). Without one, only its own lines are read.
 */
import type { CellDecl, Tap } from '../engine/ast';
import { type Meter } from '../engine/meter';
import { type CompileResult, type Resolve } from '../engine/program';
/** What a line's clock needs of the meter it taps: its lap of `bars` bars holds its `steps` a whole number of times. */
export interface ClockNeed {
    /** The tapping cell, as written (`&clave`). */
    readonly cell: string;
    /** The meter it taps: null for the piece's main meter (`step=16n`), else as written (`&m`, from `step=&m:16n`). */
    readonly meter: string | null;
    /** The tap as written: `16n`, `pulse`, `beat`, `1m`. */
    readonly tap: string;
    /** Its lap in bars (`cycle=`; 1 when it says none). */
    readonly bars: number;
    /** Its braid's length in steps. */
    readonly steps: number;
    /** Its steps per tap (`16n*2`: 2). */
    readonly rate: number;
    /** The fewest taps of its level a bar may hold: any multiple of this fits it (16 for a bar of sixteenths). */
    readonly bar: number;
}
/** A fragment's holes: what it uses and doesn't define, what it defines, what its clock needs. */
export interface Holes {
    /** Names it reads and declares nowhere (`&harm`), and `key` for the main key; sorted. */
    readonly uses: readonly string[];
    /** Of those, the names read only as a sound (a braid's step, a mix's term): they don't block the fit; sorted. */
    readonly sounds: readonly string[];
    /** Names its lines declare (`&kick`), in the order written, then those its `use` lines give. */
    readonly defines: readonly string[];
    readonly clock: readonly ClockNeed[];
}
/** The interface names: what fragments agree on and a union never renames (decision 047, point 2; more as facets need them). */
export declare const INTERFACE_NAMES: readonly string[];
/** Whether a lap of `taps` taps (the meter's, in the need's bars) meets the need: its taps times its rate a multiple of its steps. */
export declare const lapMeets: (need: Pick<ClockNeed, "steps" | "rate">, taps: number) => boolean;
/** Whether a meter meets a need: its taps of the need's level in the need's bars (`tapPositions`, the compiler's own), against its steps. */
export declare const meterMeets: (need: ClockNeed, meter: Meter, tap: Tap) => boolean;
/** A need, and the tap it reads as the parser gave it (to count its positions in a meter). */
export interface TappedNeed {
    readonly need: ClockNeed;
    readonly tap: Tap;
}
/**
 * The clock needs of the cells `of` names (every cell of `text` where it names none), as `result` compiled `text`: each
 * that taps a meter not among `own` (the cells of `text`, where it names none) and that compiled with steps. A tap of the
 * main meter is a need unless the main meter is one of `own`. A cell that didn't compile states no need here.
 */
export declare function clockNeeds(text: string, result: CompileResult, of?: ReadonlySet<string>, own?: ReadonlySet<string>): TappedNeed[];
/** Whether declarations read a name (`&bd`) only as a sound: a step of a braid or a term of a mix, never a table, a clock or a parameter. */
export declare function readOnlyAsSound(decls: readonly CellDecl[]): (name: string) => boolean;
/**
 * The lines a text's compile reads: its expansion where it has `use` lines and a resolver (decision 054: a used
 * fragment's holes are the text's), else the text.
 */
export declare const linesRead: (text: string, resolve?: Resolve) => string;
/** The line that stands in for a sound hole while a fragment is judged without its instrument (`&bd s=white`, as the seed's rhythms wrote theirs). */
export declare const standIn: (name: string) => string;
/** A fragment's holes, read off its declarations and its compile alone (`compiled`, which may be cached by text). */
export declare function holesOf(text: string, compiled: (text: string) => CompileResult, resolve?: Resolve): Holes;
